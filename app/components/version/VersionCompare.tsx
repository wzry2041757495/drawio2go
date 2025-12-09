"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Card,
  Label,
  ListBox,
  Select,
  Spinner,
  TooltipContent,
  TooltipRoot,
} from "@heroui/react";
import type { Selection } from "react-aria-components";
import {
  AlertTriangle,
  ArrowLeftRight,
  Columns,
  Loader2,
  RotateCcw,
  Rows,
  Sparkles,
  SplitSquareHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { XMLVersion } from "@/app/lib/storage/types";
import {
  generateSmartDiffSvg,
  type SmartDiffResult,
} from "@/app/lib/svg-smart-diff";
import { useAppTranslation } from "@/app/i18n/hooks";
import { extractSingleKey, normalizeSelection } from "@/app/lib/select-utils";
import { formatVersionLabel, formatVersionMeta } from "@/app/lib/version-utils";
import { useVersionPages } from "@/app/hooks/useVersionPages";
import { usePanZoomStage } from "@/app/hooks/usePanZoomStage";

interface VersionCompareProps {
  versionA: XMLVersion;
  versionB: XMLVersion;
  versions: XMLVersion[];
  isOpen: boolean;
  onClose: () => void;
}

interface PageRenderState {
  id: string;
  name: string;
  index: number;
  svg: string;
}

interface PagePair {
  index: number;
  name: string;
  left?: PageRenderState;
  right?: PageRenderState;
  smartDiff?: SmartDiffResult;
}

type CompareLayout = "split" | "stack" | "overlay" | "smart";

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

function createSvgUrl(svg?: string) {
  if (!svg) return null;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function VersionCompare({
  versionA: initialVersionA,
  versionB: initialVersionB,
  versions,
  isOpen,
  onClose,
}: VersionCompareProps) {
  const { t: tVersion, i18n } = useAppTranslation("version");
  const [isPortalReady, setIsPortalReady] = React.useState(false);
  const [currentVersionA, setCurrentVersionA] =
    React.useState<XMLVersion>(initialVersionA);
  const [currentVersionB, setCurrentVersionB] =
    React.useState<XMLVersion>(initialVersionB);
  const [pagePairs, setPagePairs] = React.useState<PagePair[]>([]);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [layout, setLayout] = React.useState<CompareLayout>("split");
  const [overlayOpacity, setOverlayOpacity] = React.useState(0.55);
  const [error, setError] = React.useState<string | null>(null);
  const {
    scale,
    offset,
    isPanning,
    zoomIn,
    zoomOut,
    resetView,
    setOffset,
    setScale,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = usePanZoomStage({
    wheelZoomStrategy: "always",
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    zoomStep: 1.2,
    isPanAllowed: () => true,
    scaleOffsetStrategy: "none",
  });
  const leftPages = useVersionPages(currentVersionA, { enabled: isOpen });
  const rightPages = useVersionPages(currentVersionB, { enabled: isOpen });
  const loading = leftPages.isLoading || rightPages.isLoading;

  React.useEffect(() => {
    setIsPortalReady(true);
    return () => setIsPortalReady(false);
  }, []);

  // 当 props 中的版本变化时，重置内部状态
  React.useEffect(() => {
    setCurrentVersionA(initialVersionA);
    setCurrentVersionB(initialVersionB);
  }, [initialVersionA, initialVersionB]);

  const currentPair = React.useMemo(() => {
    if (!pagePairs.length) return null;
    const safeIndex = Math.min(Math.max(currentIndex, 0), pagePairs.length - 1);
    return pagePairs[safeIndex];
  }, [currentIndex, pagePairs]);

  // 自适应布局：小屏默认上下堆叠
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 960) {
        setLayout((prev) => (prev === "overlay" ? prev : "stack"));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 打开时加载 pages_svg 数据（统一由 useVersionPages 提供）
  React.useEffect(() => {
    if (!isOpen) {
      setPagePairs([]);
      setWarning(null);
      setError(null);
      setCurrentIndex(0);
      resetView();
      return;
    }

    if (loading) {
      setError(null);
      return;
    }

    if (leftPages.error && rightPages.error) {
      setPagePairs([]);
      setWarning(null);
      setError(
        leftPages.error?.message ||
          rightPages.error?.message ||
          tVersion("compare.status.error"),
      );
      return;
    }

    const pagesA = leftPages.pages;
    const pagesB = rightPages.pages;

    const indexSet = new Set<number>();
    pagesA.forEach((page) => indexSet.add(page.index));
    pagesB.forEach((page) => indexSet.add(page.index));

    if (indexSet.size === 0) {
      setPagePairs([]);
      setWarning(null);
      setError(tVersion("compare.errors.missingPagesBoth"));
      return;
    }

    const indexes = Array.from(indexSet).sort((a, b) => a - b);

    const pairs: PagePair[] = indexes.map((pageIndex) => {
      const leftPage = pagesA.find((page) => page.index === pageIndex);
      const rightPage = pagesB.find((page) => page.index === pageIndex);
      const leftNameFromList =
        leftPages.pageNames[
          leftPages.pages.findIndex((page) => page.index === pageIndex)
        ];
      const rightNameFromList =
        rightPages.pageNames[
          rightPages.pages.findIndex((page) => page.index === pageIndex)
        ];
      const name =
        leftPage?.name ||
        rightPage?.name ||
        leftNameFromList ||
        rightNameFromList ||
        tVersion("compare.pages.indicator", {
          version: "",
          count: pageIndex + 1,
        });
      return {
        index: pageIndex,
        name,
        left: leftPage,
        right: rightPage,
      };
    });

    const warnings: string[] = [];
    if (!leftPages.hasPagesData) {
      warnings.push(tVersion("compare.errors.missingPagesA"));
    }
    if (!rightPages.hasPagesData) {
      warnings.push(tVersion("compare.errors.missingPagesB"));
    }
    if (pagesA.length !== pagesB.length) {
      warnings.push(
        tVersion("compare.errors.pageCountMismatch", {
          countA: pagesA.length,
          countB: pagesB.length,
        }),
      );
    } else if (pagesA.length && pagesB.length) {
      const mismatch = pagesA.findIndex(
        (page, idx) => page.name !== pagesB[idx]?.name,
      );
      if (mismatch >= 0) {
        warnings.push(tVersion("compare.errors.pageNameMismatch"));
      }
    }

    setWarning(warnings.length ? warnings.join(" · ") : null);

    const pairsWithDiff = pairs.map((pair) => ({
      ...pair,
      smartDiff: generateSmartDiffSvg(pair.left?.svg, pair.right?.svg),
    }));
    setPagePairs(pairsWithDiff);
    setError(null);
    setCurrentIndex(0);
    setOffset({ x: 0, y: 0 });
  }, [
    isOpen,
    loading,
    leftPages.error,
    rightPages.error,
    leftPages.hasPagesData,
    rightPages.hasPagesData,
    leftPages.pageNames,
    rightPages.pageNames,
    leftPages.pages,
    rightPages.pages,
    resetView,
    setOffset,
    tVersion,
  ]);

  const currentName = React.useMemo(() => {
    if (!currentPair) return "-";
    return currentPair.name;
  }, [currentPair]);

  const handleSelectPage = (keys: Selection) => {
    if (!pagePairs.length) return;
    const key = extractSingleKey(keys);
    if (key === null) return;
    const nextIndex = Number(key);
    if (Number.isNaN(nextIndex)) return;
    setCurrentIndex(Math.min(Math.max(nextIndex, 0), pagePairs.length - 1));
    setOffset({ x: 0, y: 0 });
  };

  const changeLayout = (next: CompareLayout) => {
    setLayout(next);
    setOffset({ x: 0, y: 0 });
    if (next === "smart") {
      setScale(1);
    }
  };

  // 处理版本选择
  const handleVersionChange = (target: "A" | "B", keys: Selection) => {
    const versionId = extractSingleKey(keys);
    if (versionId === null) return;
    const selectedVersion = versions.find((v) => v.id === String(versionId));
    if (!selectedVersion) return;

    if (target === "A") {
      setCurrentVersionA(selectedVersion);
    } else {
      setCurrentVersionB(selectedVersion);
    }

    // 重置视图状态
    setOffset({ x: 0, y: 0 });
    setCurrentIndex(0);
  };

  // 交换版本 A 和版本 B
  const handleSwapVersions = () => {
    const tempA = currentVersionA;
    setCurrentVersionA(currentVersionB);
    setCurrentVersionB(tempA);
    // 重置视图状态
    setOffset({ x: 0, y: 0 });
    setCurrentIndex(0);
  };

  // 键盘操作
  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (event.key === "ArrowRight") {
        setCurrentIndex((prev) => Math.min(pagePairs.length - 1, prev + 1));
      } else if (event.key === "=" || event.key === "+") {
        zoomIn();
      } else if (event.key === "-" || event.key === "_") {
        zoomOut();
      } else if (event.key === "0") {
        resetView();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, pagePairs.length, resetView, zoomIn, zoomOut]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen, tVersion]);

  const currentSmartStats = currentPair?.smartDiff?.stats;
  const currentSmartWarnings = currentPair?.smartDiff?.warnings ?? [];
  const smartDiffCoverageLabel = currentSmartStats
    ? `${Math.round(currentSmartStats.coverage * 1000) / 10}%`
    : null;
  const smartDiffImageSrc =
    layout === "smart" && currentPair?.smartDiff?.svg
      ? createSvgUrl(currentPair.smartDiff.svg)
      : null;

  if (!isOpen || !isPortalReady) return null;

  return createPortal(
    <div
      className="version-compare__overlay"
      role="dialog"
      aria-modal="true"
      aria-label={tVersion("aria.compare.dialog", {
        versionA: formatVersionMeta(currentVersionA, i18n.language),
        versionB: formatVersionMeta(currentVersionB, i18n.language),
      })}
      onClick={onClose}
    >
      <Card.Root
        className="version-compare__container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 - 独立定位在右上角 */}
        <Button
          className="version-compare__close-button"
          variant="ghost"
          isIconOnly
          aria-label={tVersion("aria.compare.close")}
          onPress={onClose}
        >
          <X className="w-4 h-4" />
        </Button>

        <Card.Header className="version-compare__header">
          {/* 版本 A 选择器 */}
          <Select
            selectedKey={currentVersionA.id}
            onSelectionChange={(keys) => {
              const selection = normalizeSelection(keys);
              if (!selection) return;
              handleVersionChange("A", selection);
            }}
            className="version-compare__version-select"
          >
            <Label>{tVersion("compare.selectors.left")}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {versions.map((v) => (
                  <ListBox.Item
                    key={v.id}
                    id={v.id}
                    textValue={formatVersionLabel(v, i18n.language)}
                  >
                    {formatVersionLabel(v, i18n.language)}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          {/* 交换按钮 */}
          <Button
            variant="ghost"
            isIconOnly
            onPress={handleSwapVersions}
            aria-label={tVersion("aria.compare.swap")}
            className="version-compare__swap-button"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </Button>

          {/* 版本 B 选择器 */}
          <Select
            selectedKey={currentVersionB.id}
            onSelectionChange={(keys) => {
              const selection = normalizeSelection(keys);
              if (!selection) return;
              handleVersionChange("B", selection);
            }}
            className="version-compare__version-select"
          >
            <Label>{tVersion("compare.selectors.right")}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {versions.map((v) => (
                  <ListBox.Item
                    key={v.id}
                    id={v.id}
                    textValue={formatVersionLabel(v, i18n.language)}
                  >
                    {formatVersionLabel(v, i18n.language)}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </Card.Header>

        {warning && (
          <div className="version-compare__warning">
            <AlertTriangle className="w-4 h-4" />
            <span>{warning}</span>
          </div>
        )}

        <Card.Content className="version-compare__body">
          <div className="version-compare__toolbar">
            <div className="version-compare__toolbar-group">
              <Button
                size="sm"
                variant="ghost"
                onPress={zoomOut}
                isDisabled={scale <= MIN_SCALE}
              >
                <ZoomOut className="w-4 h-4" />
                {tVersion("compare.zoom.out")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onPress={zoomIn}
                isDisabled={scale >= MAX_SCALE}
              >
                <ZoomIn className="w-4 h-4" />
                {tVersion("compare.zoom.in")}
              </Button>
              <Button size="sm" variant="ghost" onPress={resetView}>
                <RotateCcw className="w-4 h-4" />
                {tVersion("compare.zoom.reset")}
              </Button>
              <span className="version-compare__scale">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <div className="version-compare__toolbar-group">
              <Button
                size="sm"
                variant={layout === "split" ? "primary" : "ghost"}
                onPress={() => changeLayout("split")}
              >
                <Columns className="w-4 h-4" />{" "}
                {tVersion("compare.layout.split")}
              </Button>
              <Button
                size="sm"
                variant={layout === "stack" ? "primary" : "ghost"}
                onPress={() => changeLayout("stack")}
              >
                <Rows className="w-4 h-4" /> {tVersion("compare.layout.stack")}
              </Button>
              <Button
                size="sm"
                variant={layout === "overlay" ? "primary" : "ghost"}
                onPress={() => changeLayout("overlay")}
              >
                <SplitSquareHorizontal className="w-4 h-4" />{" "}
                {tVersion("compare.layout.overlay")}
              </Button>
              <Button
                size="sm"
                variant={layout === "smart" ? "primary" : "ghost"}
                onPress={() => changeLayout("smart")}
              >
                <Sparkles className="w-4 h-4" />{" "}
                {tVersion("compare.layout.smart")}
              </Button>
            </div>

            {layout === "overlay" && (
              <div className="version-compare__overlay-slider">
                <label htmlFor="overlayOpacity">
                  {tVersion("compare.layout.overlayOpacity")}
                </label>
                <input
                  id="overlayOpacity"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(event) =>
                    setOverlayOpacity(parseFloat(event.target.value))
                  }
                />
              </div>
            )}
          </div>

          <div className="version-compare__stage">
            {loading && (
              <div className="version-compare__loading">
                <Spinner size="sm" />
                <span>{tVersion("compare.status.loading")}</span>
              </div>
            )}

            {!loading && error && (
              <div className="version-compare__error">
                <AlertTriangle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && currentPair && (
              <div
                className={`version-compare__canvas version-compare__canvas--${layout}${isPanning ? " version-compare__canvas--panning" : ""}`}
                style={
                  layout === "smart"
                    ? undefined
                    : {
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                      }
                }
                {...(layout === "smart"
                  ? {}
                  : {
                      onPointerDown: handlePointerDown,
                      onPointerMove: handlePointerMove,
                      onPointerUp: handlePointerUp,
                      onPointerLeave: handlePointerUp,
                      onPointerCancel: handlePointerUp,
                      onWheel: handleWheel,
                    })}
              >
                {layout === "split" && (
                  <>
                    <div className="version-compare__panel">
                      {currentPair.left ? (
                        <img
                          src={createSvgUrl(currentPair.left.svg) || undefined}
                          alt={currentPair.left.name}
                          className="version-compare__image"
                          draggable={false}
                        />
                      ) : (
                        <div className="version-compare__placeholder">
                          <Loader2 className="w-5 h-5" />
                          <span>{tVersion("compare.pageStatus.missingA")}</span>
                        </div>
                      )}
                    </div>
                    <div className="version-compare__panel">
                      {currentPair.right ? (
                        <img
                          src={createSvgUrl(currentPair.right.svg) || undefined}
                          alt={currentPair.right.name}
                          className="version-compare__image"
                          draggable={false}
                        />
                      ) : (
                        <div className="version-compare__placeholder">
                          <Loader2 className="w-5 h-5" />
                          <span>{tVersion("compare.pageStatus.missingB")}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {layout === "stack" && (
                  <>
                    <div className="version-compare__panel version-compare__panel--stack">
                      {currentPair.left ? (
                        <img
                          src={createSvgUrl(currentPair.left.svg) || undefined}
                          alt={currentPair.left.name}
                          className="version-compare__image"
                          draggable={false}
                        />
                      ) : (
                        <div className="version-compare__placeholder">
                          <Loader2 className="w-5 h-5" />
                          <span>{tVersion("compare.pageStatus.missingA")}</span>
                        </div>
                      )}
                    </div>
                    <div className="version-compare__panel version-compare__panel--stack">
                      {currentPair.right ? (
                        <img
                          src={createSvgUrl(currentPair.right.svg) || undefined}
                          alt={currentPair.right.name}
                          className="version-compare__image"
                          draggable={false}
                        />
                      ) : (
                        <div className="version-compare__placeholder">
                          <Loader2 className="w-5 h-5" />
                          <span>{tVersion("compare.pageStatus.missingB")}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {layout === "overlay" && (
                  <div className="version-compare__panel version-compare__panel--overlay">
                    {currentPair.left && (
                      <img
                        src={createSvgUrl(currentPair.left.svg) || undefined}
                        alt={`${tVersion("compare.selectors.left")} · ${currentPair.left.name}`}
                        className="version-compare__image version-compare__image--overlay"
                        draggable={false}
                      />
                    )}
                    {currentPair.right && (
                      <img
                        src={createSvgUrl(currentPair.right.svg) || undefined}
                        alt={`${tVersion("compare.selectors.right")} · ${currentPair.right.name}`}
                        className="version-compare__image version-compare__image--overlay"
                        style={{ opacity: overlayOpacity }}
                        draggable={false}
                      />
                    )}
                    {!currentPair.left && (
                      <div className="version-compare__placeholder">
                        <Loader2 className="w-5 h-5" />
                        <span>{tVersion("compare.pageStatus.missingA")}</span>
                      </div>
                    )}
                    {!currentPair.right && (
                      <div className="version-compare__placeholder">
                        <Loader2 className="w-5 h-5" />
                        <span>{tVersion("compare.pageStatus.missingB")}</span>
                      </div>
                    )}
                  </div>
                )}

                {layout === "smart" && (
                  <div className="smart-diff__panel">
                    <div className="smart-diff__visual">
                      <div
                        className={`smart-diff__visual-inner${isPanning ? " smart-diff__visual-inner--panning" : ""}`}
                        style={{
                          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onWheel={handleWheel}
                      >
                        {smartDiffImageSrc ? (
                          <img
                            src={smartDiffImageSrc || undefined}
                            alt={tVersion("compare.diff.smartResultAlt")}
                            className="smart-diff__image"
                            draggable={false}
                          />
                        ) : (
                          <div className="version-compare__placeholder">
                            <Loader2 className="w-5 h-5" />
                            <span>{tVersion("compare.diff.empty")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="smart-diff__insights">
                      <div className="smart-diff__insights-header">
                        <h3>{tVersion("compare.diff.statsTitle")}</h3>
                        {smartDiffCoverageLabel && (
                          <span className="smart-diff__coverage-value">
                            {tVersion("compare.diff.coverage", {
                              coverage: smartDiffCoverageLabel,
                            })}
                          </span>
                        )}
                      </div>
                      {currentSmartStats && (
                        <div className="smart-diff__progress">
                          <div className="smart-diff__progress-track">
                            <div
                              className="smart-diff__progress-value"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    currentSmartStats.coverage * 100,
                                  ),
                                ).toFixed(1)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="smart-diff__stat-grid">
                        <div className="smart-diff__stat smart-diff__stat--match">
                          <span>{tVersion("compare.diff.matched")}</span>
                          <strong>{currentSmartStats?.matched ?? 0}</strong>
                        </div>
                        <div className="smart-diff__stat smart-diff__stat--changed">
                          <span>{tVersion("compare.diff.changed")}</span>
                          <strong>{currentSmartStats?.changed ?? 0}</strong>
                        </div>
                        <div className="smart-diff__stat smart-diff__stat--removed">
                          <span>{tVersion("compare.diff.onlyA")}</span>
                          <strong>{currentSmartStats?.onlyA ?? 0}</strong>
                        </div>
                        <div className="smart-diff__stat smart-diff__stat--added">
                          <span>{tVersion("compare.diff.onlyB")}</span>
                          <strong>{currentSmartStats?.onlyB ?? 0}</strong>
                        </div>
                      </div>

                      <div className="smart-diff__legend">
                        <div>
                          <span className="smart-diff__swatch smart-diff__swatch--match" />
                          {tVersion("compare.diff.legendAligned")}
                        </div>
                        <div>
                          <span className="smart-diff__swatch smart-diff__swatch--added" />
                          {tVersion("compare.diff.legendAddedB")}
                        </div>
                        <div>
                          <span className="smart-diff__swatch smart-diff__swatch--removed" />
                          {tVersion("compare.diff.legendOnlyA")}
                        </div>
                        <div>
                          <span className="smart-diff__swatch smart-diff__swatch--changed" />
                          {tVersion("compare.diff.legendChanged")}
                        </div>
                      </div>

                      {currentSmartWarnings.length > 0 && (
                        <div className="smart-diff__warnings">
                          <AlertTriangle className="w-4 h-4" />
                          <ul>
                            {currentSmartWarnings.map((msg, index) => (
                              <li key={`${msg}-${index}`}>{msg}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card.Content>

        <Card.Footer className="version-compare__footer">
          <div className="version-compare__page-meta">
            <TooltipRoot delay={0} closeDelay={0}>
              <span className="version-compare__page-name">{currentName}</span>
              <TooltipContent>
                {tVersion("compare.pages.shortcut")}
              </TooltipContent>
            </TooltipRoot>
            <span className="version-compare__counter">
              {pagePairs.length ? currentIndex + 1 : 0} / {pagePairs.length}
            </span>
          </div>

          <div className="version-compare__page-controls">
            <Button
              size="sm"
              variant="ghost"
              onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              isDisabled={currentIndex <= 0}
            >
              {tVersion("compare.pages.previous")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={() =>
                setCurrentIndex((prev) =>
                  Math.min(pagePairs.length - 1, prev + 1),
                )
              }
              isDisabled={currentIndex >= pagePairs.length - 1}
            >
              {tVersion("compare.pages.next")}
            </Button>

            <Select
              aria-label={tVersion("aria.compare.pageSelect")}
              className="version-compare__select"
              selectedKey={String(currentIndex)}
              onSelectionChange={(keys) => {
                const selection = normalizeSelection(keys);
                if (!selection) return;
                handleSelectPage(selection);
              }}
              isDisabled={!pagePairs.length}
            >
              <Select.Trigger className="version-compare__select-trigger">
                <Select.Value className="version-compare__select-value" />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover className="version-compare__select-content">
                <ListBox className="version-compare__select-list">
                  {pagePairs.map((pair, index) => (
                    <ListBox.Item
                      key={pair.index}
                      id={String(index)}
                      textValue={pair.name}
                      className="version-compare__select-item"
                    >
                      {index + 1}. {pair.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="version-compare__summary">
            <p>
              {currentVersionA.semantic_version} vs{" "}
              {currentVersionB.semantic_version} ·{" "}
              {tVersion("compare.pages.indicator", {
                version: "",
                count: pagePairs.length,
              })}
            </p>
            <div className="version-compare__summary-pills">
              {layout === "smart" && currentSmartStats && (
                <span className="version-compare__pill version-compare__pill--smart">
                  {tVersion("compare.diff.coverageShort", {
                    coverage: smartDiffCoverageLabel ?? "",
                  })}
                </span>
              )}
              {warning && (
                <span className="version-compare__pill">{warning}</span>
              )}
            </div>
          </div>

          <Button variant="secondary" onPress={onClose}>
            {tVersion("compare.close")}
          </Button>
        </Card.Footer>
      </Card.Root>
    </div>,
    document.body,
  );
}

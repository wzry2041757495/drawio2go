"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import {
  Button,
  Card,
  TooltipContent,
  TooltipRoot,
  Spinner,
  Select,
  ListBox,
} from "@heroui/react";
import type { Selection } from "react-aria-components";
import { usePress } from "@react-aria/interactions";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { XMLVersion } from "@/app/lib/storage/types";
import { useVersionPages } from "@/app/hooks/useVersionPages";
import { usePanZoomStage } from "@/app/hooks/usePanZoomStage";
import { useAppTranslation } from "@/app/i18n/hooks";
import { extractSingleKey, normalizeSelection } from "@/app/lib/select-utils";

interface PageSVGViewerProps {
  version: XMLVersion;
  isOpen: boolean;
  onClose: () => void;
  defaultPageIndex?: number;
}

export function PageSVGViewer({
  version,
  isOpen,
  onClose,
  defaultPageIndex = 0,
}: PageSVGViewerProps) {
  const { t: tVersion } = useAppTranslation("version");
  const { pages, isLoading, error, resolvedVersion } = useVersionPages(
    version,
    { enabled: isOpen },
  );
  const [currentIndex, setCurrentIndex] = React.useState(defaultPageIndex);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const imageNaturalSize = React.useRef<{
    width: number;
    height: number;
  } | null>(null);
  const {
    scale,
    offset,
    isPanning,
    canPan,
    zoomIn,
    zoomOut,
    resetView,
    setScale,
    setOffset,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = usePanZoomStage({
    wheelZoomStrategy: "ctrl-only",
    minScale: 0.2,
    maxScale: 4,
    zoomStep: 1.2,
    isPanAllowed: (value) => value > 1.01,
  });
  const overlayPressTargetRef = React.useRef(false);
  const handleOverlayPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    overlayPressTargetRef.current = event.target === event.currentTarget;
  };
  const { pressProps: overlayPressProps } = usePress({
    onPress: () => {
      if (overlayPressTargetRef.current) {
        onClose();
      }
      overlayPressTargetRef.current = false;
    },
  });

  React.useEffect(() => {
    if (!isOpen) {
      resetView();
      setCurrentIndex(defaultPageIndex);
      setIsFullscreen(false);
    }
  }, [defaultPageIndex, isOpen, resetView]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (!pages.length) return;
    const safeIndex = Math.min(Math.max(defaultPageIndex, 0), pages.length - 1);
    setCurrentIndex(safeIndex);
    setOffset({ x: 0, y: 0 });
  }, [defaultPageIndex, isOpen, pages, setOffset]);

  const currentPage = React.useMemo(() => {
    if (pages.length === 0) return null;
    return pages[Math.min(Math.max(currentIndex, 0), pages.length - 1)];
  }, [pages, currentIndex]);

  const canPrev = currentIndex > 0;
  const canNext = pages.length ? currentIndex < pages.length - 1 : false;
  const isPannable = canPan;
  const errorMessage = error?.message ?? null;
  const stageCursor = React.useMemo(() => {
    if (!isPannable) return "default";
    return isPanning ? "grabbing" : "grab";
  }, [isPannable, isPanning]);

  const handlePrev = React.useCallback(() => {
    if (!pages.length) return;
    setCurrentIndex((idx) => Math.max(0, idx - 1));
    setOffset({ x: 0, y: 0 });
  }, [pages, setOffset]);

  const handleNext = React.useCallback(() => {
    if (!pages.length) return;
    setCurrentIndex((idx) => Math.min(pages.length - 1, Math.max(0, idx + 1)));
    setOffset({ x: 0, y: 0 });
  }, [pages, setOffset]);

  const fitToStage = React.useCallback(() => {
    if (!stageRef.current || !currentPage || !imageNaturalSize.current) {
      resetView();
      return;
    }
    const { clientWidth, clientHeight } = stageRef.current;
    const { width, height } = imageNaturalSize.current;
    if (!width || !height) {
      resetView();
      return;
    }
    const scaleX = clientWidth / width;
    const scaleY = clientHeight / height;
    const best = Math.max(0.2, Math.min(scaleX, scaleY) * 0.98);
    setScale(parseFloat(best.toFixed(2)));
    setOffset({ x: 0, y: 0 });
  }, [currentPage, resetView, setOffset, setScale]);

  const handleSelectPage = React.useCallback(
    (keys: Selection) => {
      if (!pages.length) return;
      const key = extractSingleKey(keys);
      if (key === null) return;
      const target = Number(key);
      if (Number.isNaN(target)) return;
      const clamped = Math.min(Math.max(target, 0), pages.length - 1);
      setCurrentIndex(clamped);
      setOffset({ x: 0, y: 0 });
    },
    [pages, setOffset],
  );

  React.useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        zoomIn();
      } else if (event.key === "-") {
        event.preventDefault();
        zoomOut();
      } else if (event.key === "0") {
        event.preventDefault();
        resetView();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, handlePrev, handleNext, zoomIn, zoomOut, resetView]);

  const handleExportCurrent = React.useCallback(() => {
    if (!currentPage) return;
    const blob = new Blob([currentPage.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentPage.name || "page"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentPage]);

  const handleExportAll = React.useCallback(() => {
    if (!pages || !pages.length) return;
    const targetVersion = resolvedVersion ?? version;
    const blob = new Blob([JSON.stringify(pages)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `version-${targetVersion.semantic_version}-pages.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pages, resolvedVersion, version]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    imageNaturalSize.current = {
      width: target.naturalWidth,
      height: target.naturalHeight,
    };
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`page-svg-viewer__overlay${isFullscreen ? " page-svg-viewer__overlay--fullscreen" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={tVersion("aria.viewer.root", {
        version: version.semantic_version,
      })}
      onPointerDown={handleOverlayPointerDown}
      {...overlayPressProps}
    >
      <Card.Root
        className={`page-svg-viewer__container${isFullscreen ? " page-svg-viewer__container--fullscreen" : ""}`}
      >
        <Card.Header className="page-svg-viewer__header">
          <div className="page-svg-viewer__title">
            <span className="page-svg-viewer__heading">
              {tVersion("viewer.title")}
            </span>
            <span className="page-svg-viewer__subtext">
              {tVersion("viewer.versionSummary", {
                version: version.semantic_version,
                count: version.page_count,
              })}
            </span>
          </div>

          <div className="page-svg-viewer__header-actions">
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label={tVersion("aria.viewer.fit")}
              onPress={fitToStage}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label={
                isFullscreen
                  ? tVersion("aria.viewer.fullscreenExit")
                  : tVersion("aria.viewer.fullscreenEnter")
              }
              onPress={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label={tVersion("aria.viewer.close")}
              onPress={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card.Header>

        <Card.Content className="page-svg-viewer__body">
          <div className="page-svg-viewer__toolbar">
            <div className="page-svg-viewer__nav">
              <Button
                size="sm"
                variant="secondary"
                onPress={handlePrev}
                isDisabled={!canPrev}
                aria-label={tVersion("aria.viewer.previous")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="page-svg-viewer__counter" role="status">
                {tVersion("viewer.nav.current", {
                  current: pages.length ? currentIndex + 1 : 0,
                  total: pages.length,
                })}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onPress={handleNext}
                isDisabled={!canNext}
                aria-label={tVersion("aria.viewer.next")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="page-svg-viewer__meta">
              <TooltipRoot delay={0}>
                <span className="page-svg-viewer__page-name" role="text">
                  {currentPage?.name || "-"}
                </span>
                <TooltipContent placement="bottom">
                  <p>{tVersion("viewer.nav.hint")}</p>
                </TooltipContent>
              </TooltipRoot>
              {pages.length > 1 && (
                <Select
                  className="page-svg-viewer__select"
                  selectedKey={String(currentIndex)}
                  onSelectionChange={(keys) => {
                    const selection = normalizeSelection(keys);
                    if (!selection) return;
                    handleSelectPage(selection);
                  }}
                >
                  <Select.Trigger className="page-svg-viewer__select-trigger">
                    <Select.Value className="page-svg-viewer__select-value" />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover className="page-svg-viewer__select-content">
                    <ListBox className="page-svg-viewer__select-list">
                      {pages.map((page) => (
                        <ListBox.Item
                          key={page.index}
                          id={String(page.index)}
                          textValue={page.name}
                          className="page-svg-viewer__select-item"
                        >
                          {page.index + 1}. {page.name}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}
            </div>

            <div className="page-svg-viewer__actions">
              <Button size="sm" variant="ghost" onPress={zoomOut}>
                <ZoomOut className="w-4 h-4" />
                {tVersion("viewer.zoom.out")}
              </Button>
              <Button size="sm" variant="ghost" onPress={zoomIn}>
                <ZoomIn className="w-4 h-4" />
                {tVersion("viewer.zoom.in")}
              </Button>
              <Button size="sm" variant="ghost" onPress={resetView}>
                {tVersion("viewer.zoom.reset")}
              </Button>
              <Button size="sm" variant="ghost" onPress={fitToStage}>
                {tVersion("viewer.zoom.fit")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={handleExportCurrent}
                isDisabled={!currentPage}
              >
                <Download className="w-4 h-4" />
                {tVersion("viewer.export.current")}
              </Button>
              <Button
                size="sm"
                variant="tertiary"
                onPress={handleExportAll}
                isDisabled={!pages.length}
              >
                {tVersion("viewer.export.all")}
              </Button>
            </div>
          </div>

          <div
            className={`page-svg-viewer__stage${isPannable ? " page-svg-viewer__stage--pannable" : ""}${isPanning ? " page-svg-viewer__stage--panning" : ""}`}
            ref={stageRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {isLoading && (
              <div className="page-svg-viewer__status">
                <Spinner size="sm" />
                <span>{tVersion("viewer.loading")}</span>
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="page-svg-viewer__status page-svg-viewer__status--error">
                <span>{errorMessage}</span>
              </div>
            )}

            {!isLoading && !errorMessage && currentPage && (
              <div
                className="page-svg-viewer__canvas"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  cursor: stageCursor,
                }}
              >
                <img
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(currentPage.svg)}`}
                  alt={currentPage.name}
                  onLoad={handleImageLoad}
                  draggable={false}
                  className="page-svg-viewer__image"
                />
              </div>
            )}
          </div>
        </Card.Content>

        <Card.Footer className="page-svg-viewer__footer">
          <div className="page-svg-viewer__hint">{tVersion("viewer.help")}</div>
        </Card.Footer>
      </Card.Root>
    </div>
  );
}

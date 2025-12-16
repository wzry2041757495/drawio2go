"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import {
  Button,
  Card,
  Disclosure,
  TooltipContent,
  TooltipRoot,
} from "@heroui/react";
import type { TFunction } from "i18next";
import {
  Clock,
  Key,
  GitBranch,
  RotateCcw,
  Download,
  ChevronDown,
  ImageOff,
  LayoutGrid,
  Loader2,
  Maximize2,
  CheckSquare,
  Square,
  Activity,
  ZoomIn,
  Layers,
} from "lucide-react";
import { materializeVersionXml } from "@/app/lib/storage/xml-version-engine";
import { useStorageXMLVersions } from "@/app/hooks/useStorageXMLVersions";
import type { XMLVersion } from "@/app/lib/storage/types";
import { useToast } from "../toast";
import { PageSVGViewer } from "./PageSVGViewer";
import { createBlobFromSource, type BinarySource } from "@/app/lib/blob-utils";
import { decompressBlob } from "@/app/lib/compression-utils";
import { countSubVersions, isSubVersion } from "@/app/lib/version-utils";
import { formatVersionTimestamp } from "@/app/lib/format-utils";
import { useAppTranslation } from "@/app/i18n/hooks";
import { createLogger } from "@/lib/logger";
import { useVersionPages } from "@/app/hooks/useVersionPages";
import { parsePageNamesJson } from "@/app/lib/storage/page-metadata-validators";

const logger = createLogger("VersionCard");

interface VersionCardProps {
  version: XMLVersion;
  isLatest?: boolean;
  isWIP?: boolean;
  onRestore?: (versionId: string) => void;
  defaultExpanded?: boolean;
  compareMode?: boolean;
  selected?: boolean;
  compareOrder?: number | null;
  onToggleSelect?: (versionId: string) => void;
  onQuickCompare?: () => void;
  allVersions: XMLVersion[];
  onNavigateToSubVersions?: (parentVersion: string) => void;
}

interface PageThumbnail {
  index: number;
  name: string;
  url: string;
}

type BuildVersionCardClassNameParams = {
  isLatest: boolean;
  effectiveExpanded: boolean;
  compareMode: boolean;
  selected: boolean;
  isSubVersionEntry: boolean;
  isWIP: boolean;
};

function buildVersionCardClassName({
  isLatest,
  effectiveExpanded,
  compareMode,
  selected,
  isSubVersionEntry,
  isWIP,
}: BuildVersionCardClassNameParams): string {
  const classes = ["version-card"];
  if (isLatest) classes.push("version-card--latest");
  if (effectiveExpanded) classes.push("version-card--expanded");
  else classes.push("version-card--collapsed");
  if (compareMode) classes.push("version-card--compare");
  if (selected) classes.push("version-card--selected");
  if (isSubVersionEntry) classes.push("version-card--sub-version");
  if (isWIP) classes.push("version-card--wip");
  return classes.join(" ");
}

function getDiffLabelAndIcon(
  isWIP: boolean,
  isKeyframe: boolean,
  tVersion: TFunction,
): {
  diffLabel: string | null;
  diffIcon: React.ReactNode | null;
} {
  if (isWIP) {
    return { diffLabel: tVersion("card.meta.wip"), diffIcon: null };
  }
  if (isKeyframe) {
    return {
      diffLabel: tVersion("card.meta.keyframe"),
      diffIcon: <Key className="w-3.5 h-3.5" />,
    };
  }
  return {
    diffLabel: tVersion("card.meta.diffChain"),
    diffIcon: <GitBranch className="w-3.5 h-3.5" />,
  };
}

function bindDiffChainDepth(tVersion: TFunction, depth: number): TFunction {
  return ((key: string, options?: Record<string, unknown>) => {
    if (key === "card.meta.diffChain") {
      return tVersion(key, { ...(options ?? {}), depth });
    }
    return tVersion(key, options);
  }) as unknown as TFunction;
}

function safeParsePageNames(raw?: string | null) {
  if (!raw) return [] as string[];
  try {
    const parsed = parsePageNamesJson(raw);
    if (!parsed) return [];
    return parsed.map((name, index) => {
      if (typeof name === "string" && name.trim().length > 0) {
        return name;
      }
      return `Page ${index + 1}`;
    });
  } catch (error) {
    logger.warn("page_names 解析失败，使用兜底名称", error);
    return [];
  }
}

function useLoadVersionSVGFields(version: XMLVersion) {
  const { loadVersionSVGFields } = useStorageXMLVersions();
  const [resolvedVersion, setResolvedVersion] =
    React.useState<XMLVersion>(version);

  React.useEffect(() => {
    let cancelled = false;
    setResolvedVersion(version);

    const needsPreview = !version.preview_svg;
    const needsPages = (version.page_count ?? 0) > 1 && !version.pages_svg;
    if (!needsPreview && !needsPages) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const enriched = await loadVersionSVGFields(version);
        if (!cancelled) {
          setResolvedVersion(enriched);
        }
      } catch (error) {
        if (!cancelled) {
          logger.warn("加载版本 SVG 数据失败", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [version, loadVersionSVGFields]);

  return resolvedVersion;
}

type CompareSelectChipProps = {
  compareMode: boolean;
  isWIP: boolean;
  selected: boolean;
  compareOrder: number | null;
  versionId: string;
  tVersion: TFunction;
  onToggleSelect?: (versionId: string) => void;
};

function CompareSelectChip({
  compareMode,
  isWIP,
  selected,
  compareOrder,
  versionId,
  tVersion,
  onToggleSelect,
}: CompareSelectChipProps) {
  if (!compareMode || isWIP) return null;

  const ariaLabel = selected
    ? tVersion("aria.card.selectOrder", { order: (compareOrder ?? 0) + 1 })
    : tVersion("aria.card.selectHint");

  const label =
    selected && compareOrder !== null
      ? tVersion("card.compare.added", { order: compareOrder + 1 })
      : tVersion("card.compare.selectHint");

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={`version-card__select-chip${selected ? " version-card__select-chip--active" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggleSelect?.(versionId);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onToggleSelect?.(versionId);
        }
      }}
    >
      {selected ? (
        <CheckSquare className="w-3.5 h-3.5" />
      ) : (
        <Square className="w-3.5 h-3.5" />
      )}
      <span>{label}</span>
    </div>
  );
}

type CompactBadgesProps = {
  isLatest: boolean;
  isWIP: boolean;
  isKeyframe: boolean;
  diffDepth: number;
  pageCount: number;
  shouldShowSubVersionBadge: boolean;
  subVersionCount: number;
  tVersion: TFunction;
};

function CompactBadges({
  isLatest,
  isWIP,
  isKeyframe,
  diffDepth,
  pageCount,
  shouldShowSubVersionBadge,
  subVersionCount,
  tVersion,
}: CompactBadgesProps) {
  return (
    <>
      {isLatest && !isWIP && (
        <span className="latest-badge">{tVersion("card.badges.latest")}</span>
      )}
      {!isWIP &&
        (isKeyframe ? (
          <TooltipRoot>
            <span className="keyframe-badge">
              <Key className="w-3 h-3" />
            </span>
            <TooltipContent>{tVersion("card.badges.keyframe")}</TooltipContent>
          </TooltipRoot>
        ) : (
          <TooltipRoot>
            <span className="diff-badge">
              <GitBranch className="w-3 h-3" />+{diffDepth}
            </span>
            <TooltipContent>
              {tVersion("card.badges.diffDepth", { depth: diffDepth })}
            </TooltipContent>
          </TooltipRoot>
        ))}
      {pageCount > 1 && (
        <TooltipRoot>
          <span className="page-count-badge">
            <LayoutGrid className="w-3 h-3" />
            {pageCount}
          </span>
          <TooltipContent>
            {tVersion("card.badges.pages", { count: pageCount })}
          </TooltipContent>
        </TooltipRoot>
      )}
      {shouldShowSubVersionBadge && (
        <TooltipRoot>
          <span
            className="version-card__sub-version-badge"
            aria-label={tVersion("aria.card.subVersionBadge", {
              count: subVersionCount,
            })}
          >
            <Layers className="w-3 h-3" />
            {subVersionCount}
          </span>
          <TooltipContent>
            {tVersion("card.badges.subVersions", { count: subVersionCount })}
          </TooltipContent>
        </TooltipRoot>
      )}
    </>
  );
}

type ExpandedPagesGridProps = {
  showAllPages: boolean;
  isLoadingPages: boolean;
  effectivePagesError: string | null;
  pageThumbs: PageThumbnail[];
  versionId: string;
  tVersion: TFunction;
  onActivateThumb: (pageIndex: number) => void;
};

function ExpandedPagesGrid({
  showAllPages,
  isLoadingPages,
  effectivePagesError,
  pageThumbs,
  versionId,
  tVersion,
  onActivateThumb,
}: ExpandedPagesGridProps) {
  if (!showAllPages) return null;

  if (isLoadingPages) {
    return (
      <div className="version-pages-grid">
        <div className="version-pages-grid__status">
          <Loader2 className="version-pages-grid__spinner" />
          <span>{tVersion("card.preview.loadingPages")}</span>
        </div>
      </div>
    );
  }

  if (effectivePagesError) {
    return (
      <div className="version-pages-grid">
        <div className="version-pages-grid__status version-pages-grid__status--error">
          <ImageOff className="version-pages-grid__status-icon" />
          <span>{effectivePagesError}</span>
        </div>
      </div>
    );
  }

  if (pageThumbs.length === 0) {
    return (
      <div className="version-pages-grid">
        <div className="version-pages-grid__status version-pages-grid__status--empty">
          <ImageOff className="version-pages-grid__status-icon" />
          <span>{tVersion("card.preview.pagesEmpty")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="version-pages-grid">
      <div className="version-pages-grid__inner">
        {pageThumbs.map((thumb) => (
          <button
            key={`${versionId}-page-${thumb.index}`}
            type="button"
            className="version-pages-grid__item"
            onClick={() => onActivateThumb(thumb.index)}
            title={tVersion("card.preview.thumbTitle", {
              index: thumb.index + 1,
              name: thumb.name,
            })}
          >
            <div className="version-pages-grid__thumb">
              <img
                src={thumb.url}
                alt={tVersion("card.preview.thumbAlt", {
                  index: thumb.index + 1,
                })}
                loading="lazy"
              />
            </div>
            <div className="version-pages-grid__label">
              <span className="version-pages-grid__label-index">
                {thumb.index + 1}
              </span>
              <span className="version-pages-grid__label-name">
                {thumb.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 版本卡片组件 - 紧凑折叠模式
 * 默认显示折叠视图(版本号+徽章+时间),点击展开查看完整信息
 */
export function VersionCard({
  version,
  isLatest,
  isWIP = false,
  onRestore,
  defaultExpanded = false,
  compareMode = false,
  selected = false,
  compareOrder = null,
  onToggleSelect,
  onQuickCompare,
  allVersions,
  onNavigateToSubVersions,
}: VersionCardProps) {
  const { t: tVersion, i18n } = useAppTranslation("version");
  const { t: tCommon } = useAppTranslation("common");
  const [isExporting, setIsExporting] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded && !isWIP);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [showAllPages, setShowAllPages] = React.useState(false);
  const [pageThumbs, setPageThumbs] = React.useState<PageThumbnail[]>([]);
  const [pagesError, setPagesError] = React.useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerInitialPage, setViewerInitialPage] = React.useState(0);
  const pageObjectUrlsRef = React.useRef<string[]>([]);
  const { getXMLVersion } = useStorageXMLVersions();
  const { push } = useToast();
  const resolvedVersion = useLoadVersionSVGFields(version);
  const isSubVersionEntry = React.useMemo(
    () => isSubVersion(version.semantic_version),
    [version.semantic_version],
  );
  const subVersionCount = React.useMemo(() => {
    if (isSubVersionEntry) return 0;
    return countSubVersions(allVersions, version.semantic_version);
  }, [allVersions, isSubVersionEntry, version.semantic_version]);
  const shouldShowSubVersionBadge =
    !isWIP && !isSubVersionEntry && subVersionCount > 0;
  const shouldShowSubVersionButton =
    shouldShowSubVersionBadge && Boolean(onNavigateToSubVersions);
  const versionPages = useVersionPages(resolvedVersion, {
    enabled: showAllPages,
  });
  const fallbackPageNames = React.useMemo(
    () => safeParsePageNames(resolvedVersion.page_names),
    [resolvedVersion.page_names],
  );
  const pageNames = React.useMemo(
    () =>
      versionPages.pageNames.length
        ? versionPages.pageNames
        : fallbackPageNames,
    [fallbackPageNames, versionPages.pageNames],
  );
  const isLoadingPages = showAllPages && versionPages.isLoading;
  const effectivePagesError = versionPages.error?.message ?? pagesError;
  const effectiveExpanded = isWIP ? false : isExpanded;

  const versionLabel = isWIP ? "WIP" : `v${version.semantic_version}`;
  const { diffLabel, diffIcon } = getDiffLabelAndIcon(
    isWIP,
    resolvedVersion.is_keyframe,
    bindDiffChainDepth(tVersion, resolvedVersion.diff_chain_depth),
  );

  const hasMultiplePages = (resolvedVersion.page_count ?? 0) > 1;

  // WIP 卡片保持折叠状态
  React.useEffect(() => {
    if (isWIP && isExpanded) {
      setIsExpanded(false);
    }
  }, [isExpanded, isWIP]);

  const openViewer = React.useCallback((pageIndex: number) => {
    setViewerInitialPage(Math.max(0, pageIndex));
    setViewerOpen(true);
  }, []);

  const handlePreviewActivate = React.useCallback(() => {
    openViewer(0);
  }, [openViewer]);

  const handleThumbnailActivate = React.useCallback(
    (pageIndex: number) => {
      openViewer(pageIndex);
    },
    [openViewer],
  );

  const handleCardAreaClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isWIP) return;
      const target = e.target as HTMLElement;
      if (
        target?.closest(
          "button, a, [role='button'], input, textarea, .version-preview__container, .version-card__pages-grid",
        )
      ) {
        return;
      }

      if (!isExpanded) {
        setIsExpanded(true);
        return;
      }

      const expandedContent = target?.closest(
        ".version-card__expanded-content",
      );
      if (!expandedContent) {
        setIsExpanded(false);
      }
    },
    [isExpanded, isWIP],
  );

  // 格式化创建时间
  const createdAtFull = formatVersionTimestamp(
    resolvedVersion.created_at,
    "full",
    i18n.language,
  );

  const createdAtCompact = formatVersionTimestamp(
    resolvedVersion.created_at,
    "compact",
    i18n.language,
  );

  // 管理 preview_svg 的 Object URL（需要先解压）
  React.useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      if (!resolvedVersion.preview_svg) {
        setPreviewUrl(null);
        return;
      }

      const compressedBlob = createBlobFromSource(
        resolvedVersion.preview_svg as BinarySource,
        "application/octet-stream",
      );

      if (!compressedBlob) {
        setPreviewUrl(null);
        return;
      }

      try {
        const decompressed = await decompressBlob(compressedBlob);
        if (cancelled) return;
        const typedBlob = decompressed.type
          ? decompressed
          : new Blob([await decompressed.arrayBuffer()], {
              type: "image/svg+xml",
            });
        objectUrl = URL.createObjectURL(typedBlob);
        setPreviewUrl(objectUrl);
      } catch (error) {
        logger.warn("解压 preview_svg 失败", error);
        if (!cancelled) {
          setPreviewUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedVersion.id, resolvedVersion.preview_svg]);

  const cleanupPageUrls = React.useCallback(() => {
    pageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    pageObjectUrlsRef.current = [];
  }, []);

  React.useEffect(() => {
    if (!hasMultiplePages && showAllPages) {
      setShowAllPages(false);
    }
  }, [hasMultiplePages, showAllPages]);

  // 折叠时关闭全部页面视图并清理
  React.useEffect(() => {
    if (!isExpanded) {
      setShowAllPages(false);
      setPageThumbs([]);
      setPagesError(null);
      cleanupPageUrls();
    }
  }, [cleanupPageUrls, isExpanded]);

  // 懒加载 pages_svg
  React.useEffect(() => {
    cleanupPageUrls();
    if (!showAllPages) {
      setPageThumbs([]);
      setPagesError(null);
      return;
    }

    if (versionPages.isLoading) {
      setPageThumbs([]);
      setPagesError(null);
      return;
    }

    if (versionPages.error) {
      setPageThumbs([]);
      setPagesError(versionPages.error.message);
      return;
    }

    if (!versionPages.pages.length) {
      setPageThumbs([]);
      setPagesError(tVersion("card.preview.pagesError"));
      return;
    }

    const thumbs = versionPages.pages
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((page) => {
        const svgBlob = new Blob([page.svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);
        pageObjectUrlsRef.current.push(url);
        return {
          index: page.index,
          name:
            typeof page.name === "string" && page.name.trim().length > 0
              ? page.name
              : `Page ${page.index + 1}`,
          url,
        };
      });

    setPageThumbs(thumbs);
    setPagesError(null);

    return () => {
      cleanupPageUrls();
    };
  }, [
    cleanupPageUrls,
    showAllPages,
    tVersion,
    versionPages.error,
    versionPages.isLoading,
    versionPages.pages,
  ]);

  // 处理回滚按钮点击
  const handleRestore = () => {
    if (onRestore) {
      try {
        onRestore(version.id);
      } catch (error) {
        logger.error("回滚版本失败:", error);
      }
    }
  };

  // 处理导出按钮点击
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 恢复完整 XML
      const fullXml = await materializeVersionXml(version, (id) =>
        getXMLVersion(id, version.project_uuid),
      );

      // 创建下载
      const blob = new Blob([fullXml], { type: "text/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagram-v${version.semantic_version}.drawio`;
      a.click();
      URL.revokeObjectURL(url);

      logger.debug(` 版本 ${version.semantic_version} 导出成功`);
    } catch (error) {
      logger.error("导出版本失败:", error);
      push({
        variant: "danger",
        description: tCommon("toasts.versionExportFailed", {
          version: version.semantic_version,
          error:
            error instanceof Error
              ? error.message
              : tCommon("toasts.exportFailed"),
        }),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card.Root
      className={buildVersionCardClassName({
        isLatest: Boolean(isLatest),
        effectiveExpanded,
        compareMode,
        selected,
        isSubVersionEntry,
        isWIP,
      })}
      variant="secondary"
      onClick={handleCardAreaClick}
    >
      <Card.Content className="version-card__content">
        <Disclosure
          isExpanded={effectiveExpanded}
          onExpandedChange={(expanded) => {
            if (isWIP) return;
            setIsExpanded(expanded);
          }}
        >
          {/* 折叠状态的紧凑视图 - 始终显示 */}
          <Disclosure.Heading>
            <button
              type="button"
              className="version-card__trigger"
              onClick={() => {
                if (isWIP) return;
                setIsExpanded(!isExpanded);
              }}
              aria-expanded={effectiveExpanded}
              aria-disabled={isWIP}
            >
              <div className="version-card__compact-view">
                <CompareSelectChip
                  compareMode={compareMode}
                  isWIP={isWIP}
                  selected={selected}
                  compareOrder={compareOrder}
                  versionId={version.id}
                  tVersion={tVersion}
                  onToggleSelect={onToggleSelect}
                />
                <div className="version-card__compact-left">
                  <span className="version-number">{versionLabel}</span>
                  <CompactBadges
                    isLatest={Boolean(isLatest)}
                    isWIP={isWIP}
                    isKeyframe={version.is_keyframe}
                    diffDepth={version.diff_chain_depth}
                    pageCount={version.page_count}
                    shouldShowSubVersionBadge={shouldShowSubVersionBadge}
                    subVersionCount={subVersionCount}
                    tVersion={tVersion}
                  />
                  {/* 内联描述（自适应宽度，仅有描述时显示） */}
                  {isWIP ? (
                    <span
                      className="version-card__compact-description"
                      title={tVersion("card.badges.wip")}
                    >
                      {tVersion("card.badges.wip")}
                    </span>
                  ) : (
                    version.description && (
                      <span
                        className="version-card__compact-description"
                        title={version.description}
                      >
                        {version.description}
                      </span>
                    )
                  )}
                </div>
                <div className="version-card__compact-right">
                  {compareMode && selected && (
                    <span className="version-card__chip">
                      {compareOrder !== null
                        ? tVersion("card.compare.selectedOrder", {
                            order: compareOrder + 1,
                          })
                        : tVersion("card.compare.selected")}
                    </span>
                  )}
                  <span className="version-card__time">
                    <Clock className="w-3 h-3" />
                    {createdAtCompact}
                  </span>
                  {!isWIP && (
                    <ChevronDown
                      className={`version-card__chevron${effectiveExpanded ? " rotated" : ""}`}
                    />
                  )}
                </div>
              </div>
            </button>
          </Disclosure.Heading>

          {/* 展开状态的完整内容 */}
          <Disclosure.Content hidden={isWIP}>
            <div className="version-card__expanded-content">
              {!isWIP &&
                version.name &&
                version.name !== version.semantic_version && (
                  <h4 className="version-card__name">{version.name}</h4>
                )}

              {!isWIP && version.description && (
                <p className="version-card__description">
                  {version.description}
                </p>
              )}

              <div className="version-card__media">
                {previewUrl ? (
                  <div
                    className="version-preview version-preview--interactive"
                    role="button"
                    tabIndex={0}
                    aria-label={
                      hasMultiplePages
                        ? tVersion("aria.card.openFullscreenPages", {
                            count: version.page_count,
                          })
                        : tVersion("aria.card.openFullscreen", {
                            label: versionLabel,
                          })
                    }
                    onClick={handlePreviewActivate}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handlePreviewActivate();
                      }
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt={tVersion("aria.card.openFullscreen", {
                        label: versionLabel,
                      })}
                      className="version-preview__image"
                      loading="lazy"
                    />
                    <div className="version-preview__overlay">
                      <ZoomIn className="version-preview__zoom-icon" />
                      <span className="version-preview__zoom-text">
                        {tVersion("card.preview.zoomHint")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="version-preview version-preview--placeholder">
                    <ImageOff className="version-preview__placeholder-icon" />
                    <p className="version-preview__placeholder-title">
                      {tVersion("card.preview.emptyTitle")}
                    </p>
                    <span className="version-preview__placeholder-text">
                      {tVersion("card.preview.emptyDescription")}
                    </span>
                  </div>
                )}

                <div className="version-preview__meta">
                  <div className="version-preview__badges">
                    {version.page_count > 0 && pageNames.length > 0 && (
                      <TooltipRoot delay={0}>
                        <span className="version-page-badge" role="text">
                          <LayoutGrid className="w-3 h-3" />
                          {tVersion("card.preview.pageBadge", {
                            count: version.page_count,
                          })}
                        </span>
                        <TooltipContent placement="top">
                          <p>{pageNames.join(" / ")}</p>
                        </TooltipContent>
                      </TooltipRoot>
                    )}
                    {version.page_count > 0 && pageNames.length === 0 && (
                      <span className="version-page-badge" role="text">
                        <LayoutGrid className="w-3 h-3" />
                        {tVersion("card.preview.pageBadge", {
                          count: version.page_count,
                        })}
                      </span>
                    )}
                    {!previewUrl && (
                      <span className="version-preview__hint">
                        {tVersion("card.preview.missingPreview")}
                      </span>
                    )}
                  </div>

                  {hasMultiplePages && (
                    <div className="version-preview__actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => setShowAllPages((prev) => !prev)}
                        aria-expanded={showAllPages}
                        aria-label={
                          showAllPages
                            ? tVersion("card.preview.toggleThumbsAriaCollapse")
                            : tVersion("card.preview.toggleThumbsAriaExpand")
                        }
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        {showAllPages
                          ? tVersion("card.preview.toggleThumbsCollapse")
                          : tVersion("card.preview.toggleThumbsExpand")}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => openViewer(0)}
                        aria-label={tVersion("aria.card.openMultiViewer", {
                          count: version.page_count,
                        })}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        {tVersion("card.preview.openViewer", {
                          count: version.page_count,
                        })}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <ExpandedPagesGrid
                showAllPages={showAllPages}
                isLoadingPages={isLoadingPages}
                effectivePagesError={effectivePagesError}
                pageThumbs={pageThumbs}
                versionId={version.id}
                tVersion={tVersion}
                onActivateThumb={handleThumbnailActivate}
              />

              <div className="version-card__meta">
                <div className="version-card__meta-item">
                  {isWIP ? <Activity className="w-3 h-3" /> : diffIcon}
                  <span>{diffLabel}</span>
                </div>
                <div className="version-card__meta-item">
                  <Clock className="w-3 h-3" />
                  <span>{createdAtFull}</span>
                </div>
              </div>

              {!isWIP && (
                <div className="version-card__actions">
                  {shouldShowSubVersionButton && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        onNavigateToSubVersions?.(version.semantic_version)
                      }
                      aria-label={tVersion("aria.card.subVersionBadge", {
                        count: subVersionCount,
                      })}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {tVersion("card.actions.viewSubVersions", {
                        count: subVersionCount,
                      })}
                    </Button>
                  )}
                  {onQuickCompare && (
                    <Button size="sm" variant="ghost" onPress={onQuickCompare}>
                      <LayoutGrid className="w-3.5 h-3.5" />
                      {tVersion("card.actions.quickCompare")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="tertiary"
                    onPress={handleExport}
                    isDisabled={isExporting}
                    aria-label={tVersion("card.actions.export")}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {tVersion("card.actions.export")}
                  </Button>

                  {onRestore && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={handleRestore}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {tVersion("card.actions.restore")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Disclosure.Content>
        </Disclosure>
      </Card.Content>
      <PageSVGViewer
        version={resolvedVersion}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        defaultPageIndex={viewerInitialPage}
      />
    </Card.Root>
  );
}

"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Button, Skeleton } from "@heroui/react";
import {
  VersionTimeline,
  type VersionTimelineViewMode,
} from "./version/VersionTimeline";
import { CreateVersionDialog } from "./version/CreateVersionDialog";
import { VersionCompare } from "./version/VersionCompare";
import { useVersionCompare } from "@/app/hooks/useVersionCompare";
import {
  useStorageXMLVersions,
  type CreateHistoricalVersionResult,
} from "@/app/hooks/useStorageXMLVersions";
import { History, Save } from "lucide-react";
import { useToast } from "@/app/components/toast";
import type { XMLVersion } from "@/app/lib/storage/types";
import type { DrawioEditorRef } from "@/app/components/DrawioEditorNative";
import { useAppTranslation } from "@/app/i18n/hooks";
import { createLogger } from "@/lib/logger";

const logger = createLogger("VersionSidebar");

interface VersionSidebarProps {
  projectUuid: string | null;
  onVersionRestore?: (versionId: string) => void;
  editorRef: RefObject<DrawioEditorRef | null>;
}

/**
 * 版本侧边栏主组件
 * 集成 WIP 指示器、版本时间线和创建版本对话框
 */
export function VersionSidebar({
  projectUuid,
  onVersionRestore,
  editorRef,
}: VersionSidebarProps) {
  const { t: tCommon } = useAppTranslation("common");
  const { t: tVersion } = useAppTranslation("version");
  const { push } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [versions, setVersions] = useState<XMLVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineViewMode, setTimelineViewMode] =
    useState<VersionTimelineViewMode>({ type: "main" });

  const { subscribeVersions, getAllXMLVersions } = useStorageXMLVersions();
  const compare = useVersionCompare();
  const { isDialogOpen, activePair, openDialogWithPair, closeDialog } = compare;

  const activeParentVersion =
    timelineViewMode.type === "sub"
      ? timelineViewMode.parentVersion
      : undefined;

  const handleTimelineViewModeChange = useCallback(
    (mode: VersionTimelineViewMode) => {
      setTimelineViewMode(mode);
    },
    [setTimelineViewMode],
  );

  const handleNavigateToSubVersions = useCallback(
    (parentVersion: string) => {
      setTimelineViewMode((prev) => {
        if (prev.type === "sub" && prev.parentVersion === parentVersion) {
          return prev;
        }
        return { type: "sub", parentVersion };
      });
    },
    [setTimelineViewMode],
  );

  useEffect(() => {
    if (!projectUuid) {
      setVersions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeVersions(
      projectUuid,
      (nextVersions) => {
        setVersions(nextVersions);
        setIsLoading(false);
      },
      () => {
        setError(tVersion("sidebar.loadError.description"));
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [projectUuid, subscribeVersions, tVersion]);

  useEffect(() => {
    setTimelineViewMode({ type: "main" });
  }, [projectUuid, setTimelineViewMode]);

  const handleReload = useCallback(async () => {
    if (!projectUuid) return;
    setIsLoading(true);
    setError(null);
    try {
      await getAllXMLVersions(projectUuid);
    } catch (err) {
      logger.error(tVersion("sidebar.loadError.description"), err);
      setError(tVersion("sidebar.loadError.description"));
    } finally {
      setIsLoading(false);
    }
  }, [getAllXMLVersions, projectUuid, tVersion]);

  // 版本创建后反馈提示
  const handleVersionCreated = useCallback(
    (result?: CreateHistoricalVersionResult) => {
      if (result) {
        const tone = result.svgAttached ? "success" : "warning";
        const message = result.svgAttached
          ? tCommon("toasts.versionCreateSuccess", {
              pageCount: result.pageCount,
            })
          : tCommon("toasts.versionCreateDegraded", {
              pageCount: result.pageCount,
            });
        push({
          variant: tone,
          title:
            tone === "success"
              ? tCommon("toasts.versionCreateSuccessTitle")
              : tCommon("toasts.versionCreateDegradedTitle"),
          description: message,
        });
      }
    },
    [push, tCommon],
  );

  // 如果没有选择项目，显示空状态
  if (!projectUuid) {
    return (
      <div className="version-sidebar version-sidebar--empty">
        <div className="empty-state-card">
          <History className="empty-state-card__icon" />
          <p className="empty-state-card__title">
            {tVersion("sidebar.noProject.title")}
          </p>
          <p className="empty-state-card__description">
            {tVersion("sidebar.noProject.description")}
          </p>
        </div>
      </div>
    );
  }

  // 如果加载失败，显示错误状态
  if (error) {
    return (
      <div className="version-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header__info">
            <div className="sidebar-header__icon">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {tVersion("sidebar.loadError.title")}
              </h2>
              <p className="sidebar-header__description">
                {tVersion("sidebar.loadError.description")}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onPress={handleReload}
            className="version-sidebar__retry"
          >
            {tVersion("sidebar.loadError.retry")}
          </Button>
        </div>
        <div className="empty-state-card">
          <p
            className="empty-state-card__description"
            style={{ color: "var(--danger)" }}
          >
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="version-sidebar">
      {/* 顶部标题和操作按钮 */}
      <div className="sidebar-header">
        <div className="sidebar-header__info">
          <div className="sidebar-header__icon">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {tVersion("sidebar.title")}
            </h2>
            <p className="sidebar-header__description">
              {tVersion("sidebar.subtitle")}
            </p>
          </div>
        </div>
        <div className="sidebar-header__actions">
          <Button
            size="sm"
            variant="primary"
            onPress={() => setShowCreateDialog(true)}
            className="version-sidebar__cta"
            isDisabled={isLoading}
          >
            <Save className="w-4 h-4" />
            {tVersion("sidebar.actions.create")}
          </Button>
        </div>
      </div>

      {/* 滚动内容区域 */}
      <div className="sidebar-content">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-xl" />
            <VersionTimeline
              projectUuid={projectUuid}
              versions={versions}
              onVersionRestore={onVersionRestore}
              onVersionCreated={handleVersionCreated}
              isLoading
              viewMode={timelineViewMode}
              onViewModeChange={handleTimelineViewModeChange}
              onNavigateToSubVersions={handleNavigateToSubVersions}
            />
          </div>
        ) : (
          <VersionTimeline
            projectUuid={projectUuid}
            versions={versions}
            onVersionRestore={onVersionRestore}
            onVersionCreated={handleVersionCreated}
            onQuickCompare={openDialogWithPair}
            viewMode={timelineViewMode}
            onViewModeChange={handleTimelineViewModeChange}
            onNavigateToSubVersions={handleNavigateToSubVersions}
          />
        )}
      </div>

      {/* 创建版本对话框 */}
      <CreateVersionDialog
        projectUuid={projectUuid}
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onVersionCreated={handleVersionCreated}
        editorRef={editorRef}
        parentVersion={activeParentVersion}
      />

      {isDialogOpen && activePair && (
        <VersionCompare
          versionA={activePair.versionA}
          versionB={activePair.versionB}
          versions={versions}
          isOpen={isDialogOpen}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}

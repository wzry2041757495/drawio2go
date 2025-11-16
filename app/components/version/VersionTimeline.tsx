"use client";

import React from "react";
import { Skeleton } from "@heroui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { History } from "lucide-react";
import { VersionCard } from "./VersionCard";
import { WIP_VERSION } from "@/app/lib/storage/constants";
import type { XMLVersion } from "@/app/lib/storage/types";

// 虚拟滚动阈值 - 版本数量超过此值时启用虚拟滚动
const VIRTUAL_SCROLL_THRESHOLD = 50;

interface VersionTimelineProps {
  projectUuid: string;
  versions: XMLVersion[];
  onVersionRestore?: (versionId: string) => void;
  onVersionCreated?: () => void;
  isLoading?: boolean;
}

/**
 * 版本时间线组件 - 支持虚拟滚动
 * 显示所有历史版本的时间线列表（不包括 WIP 版本）
 * 当版本数 > 50 时自动启用虚拟滚动优化性能
 */
export function VersionTimeline({
  versions,
  onVersionRestore,
  isLoading = false,
}: VersionTimelineProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const skeletonItems = React.useMemo(() => Array.from({ length: 3 }), []);

  // 过滤出历史版本（排除 WIP）并按时间倒序排列
  const historicalVersions = React.useMemo(() => {
    try {
      return versions
        .filter((v) => v.semantic_version !== WIP_VERSION)
        .sort((a, b) => b.created_at - a.created_at);
    } catch (error) {
      console.error("版本排序失败:", error);
      return [];
    }
  }, [versions]);

  // 是否启用虚拟滚动
  const enableVirtualScroll =
    !isLoading && historicalVersions.length > VIRTUAL_SCROLL_THRESHOLD;

  // 配置虚拟滚动器
  const virtualizer = useVirtualizer({
    count: historicalVersions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 5,
    enabled: enableVirtualScroll,
  });

  if (isLoading) {
    return (
      <div className="version-timeline">
        <div className="timeline-header">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 rounded-lg" />
            <Skeleton className="h-3 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="timeline-list timeline-list--skeleton">
          {skeletonItems.map((_, index) => (
            <Skeleton
              key={`timeline-skeleton-${index}`}
              className="h-20 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  // 如果没有历史版本，显示空状态
  if (historicalVersions.length === 0) {
    return (
      <div className="version-timeline-empty">
        <div className="empty-state-small">
          <div className="empty-state-icon">
            <History className="w-5 h-5" />
          </div>
          <p>暂无历史版本</p>
          <p>点击“保存版本”创建第一份快照</p>
        </div>
      </div>
    );
  }

  // 渲染虚拟滚动列表
  const renderVirtualList = () => {
    const virtualItems = virtualizer.getVirtualItems();

    return (
      <div
        ref={parentRef}
        className="timeline-list"
        style={{
          height: "100%",
          overflow: "auto",
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualItem) => {
            const version = historicalVersions[virtualItem.index];
            return (
              <div
                key={version.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <VersionCard
                  version={version}
                  isLatest={virtualItem.index === 0}
                  onRestore={onVersionRestore}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染普通列表（无虚拟滚动）
  const renderNormalList = () => (
    <div className="timeline-list">
      {historicalVersions.map((version, index) => (
        <VersionCard
          key={version.id}
          version={version}
          isLatest={index === 0}
          onRestore={onVersionRestore}
        />
      ))}
    </div>
  );

  return (
    <div className="version-timeline">
      {/* 时间线头部 */}
      <div className="timeline-header">
        <div>
          <h3>历史版本</h3>
          <p className="timeline-description">
            按时间倒序的快照记录
            {enableVirtualScroll && " • 虚拟滚动已启用"}
          </p>
        </div>
        <span className="timeline-chip">
          {historicalVersions.length} 个快照
        </span>
      </div>

      {/* 版本列表 - 根据数量选择渲染方式 */}
      {enableVirtualScroll ? renderVirtualList() : renderNormalList()}
    </div>
  );
}

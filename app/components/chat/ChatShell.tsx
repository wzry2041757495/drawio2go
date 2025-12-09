"use client";

import type { ReactNode } from "react";

interface ChatShellProps {
  view: "chat" | "history";
  alerts?: ReactNode;
  header?: ReactNode;
  chatPane: ReactNode;
  historyPane: ReactNode;
}

/**
 * 聊天侧边栏的外层布局容器
 *
 * - 负责切换聊天/历史视图
 * - 统一留出顶部区域（提示/导航）
 * - 保持原有布局结构，避免影响滚动行为
 */
export default function ChatShell({
  view,
  alerts,
  header,
  chatPane,
  historyPane,
}: ChatShellProps) {
  if (view === "history") {
    return <div className="chat-sidebar-content">{historyPane}</div>;
  }

  return (
    <div className="chat-sidebar-content">
      {alerts}
      {header}
      {chatPane}
    </div>
  );
}

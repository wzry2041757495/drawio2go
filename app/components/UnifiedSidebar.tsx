"use client";

import { useState, useEffect, useRef, type Key, type RefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Tabs } from "@heroui/react";
import { History, MessageSquare, Settings } from "lucide-react";
import ChatSidebar from "./ChatSidebar";
import SettingsSidebar from "./SettingsSidebar";
import { VersionSidebar } from "./VersionSidebar";
import { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from "./constants/sidebar";
import { useStorageSettings } from "@/app/hooks/useStorageSettings";
import type { DrawioEditorRef } from "@/app/components/DrawioEditorNative";

export type SidebarTab = "chat" | "settings" | "version";

interface UnifiedSidebarProps {
  isOpen: boolean;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  onSettingsChange?: (settings: { defaultPath: string }) => void;
  currentProjectId?: string;
  projectUuid?: string | null;
  onVersionRestore?: (versionId: string) => void;
  editorRef: RefObject<DrawioEditorRef | null>;
}

type SidebarPointerEvent = ReactPointerEvent<HTMLDivElement>;

const TAB_ITEMS: Array<{
  key: SidebarTab;
  label: string;
  Icon: typeof MessageSquare;
}> = [
  { key: "chat", label: "聊天", Icon: MessageSquare },
  { key: "settings", label: "设置", Icon: Settings },
  { key: "version", label: "版本", Icon: History },
];

export default function UnifiedSidebar({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  onSettingsChange,
  currentProjectId,
  projectUuid,
  onVersionRestore,
  editorRef,
}: UnifiedSidebarProps) {
  // 存储 Hook
  const { getSetting, setSetting } = useStorageSettings();

  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const handleTabSelection = (key: Key) => {
    onTabChange(key as SidebarTab);
  };

  const applySidebarWidth = (width: number) => {
    setSidebarWidth(width);
    document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
  };

  const calculateWidth = (clientX: number) => {
    const viewportWidth = window.innerWidth;
    const rawWidth = viewportWidth - clientX;
    const clampedMax = Math.min(SIDEBAR_MAX_WIDTH, viewportWidth);
    return Math.max(SIDEBAR_MIN_WIDTH, Math.min(rawWidth, clampedMax));
  };

  const finalizeResize = async () => {
    setIsResizing(false);
    try {
      await setSetting(
        "unifiedSidebarWidth",
        sidebarWidthRef.current.toString(),
      );
    } catch (e) {
      console.error("保存侧栏宽度失败:", e);
    }
  };

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // 从存储恢复侧栏宽度
  useEffect(() => {
    const loadWidth = async () => {
      try {
        const savedWidth = await getSetting("unifiedSidebarWidth");
        if (savedWidth) {
          const width = parseInt(savedWidth);
          applySidebarWidth(width);
        }
      } catch (e) {
        console.error("加载侧栏宽度失败:", e);
      }
    };

    loadWidth();
  }, [getSetting]);

  const handlePointerDown = (e: SidebarPointerEvent) => {
    if (e.button !== 0 && e.pointerType !== "touch") {
      return;
    }
    e.preventDefault();
    setIsResizing(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("无法捕获指针事件:", err);
    }
  };

  const handlePointerMove = (e: SidebarPointerEvent) => {
    if (!isResizing) return;
    const newWidth = calculateWidth(e.clientX);
    applySidebarWidth(newWidth);
  };

  const handlePointerUp = async (e: SidebarPointerEvent) => {
    if (!isResizing) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      console.warn("释放指针捕获失败:", err);
    }
    await finalizeResize();
  };

  return (
    <div
      className={`unified-sidebar ${isOpen ? "open" : ""} ${
        isResizing ? "resizing" : ""
      }`}
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* 拖拽分隔条 */}
      <div
        className="resize-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="sidebar-tabs-shell">
        <Tabs
          aria-label="侧栏导航"
          selectedKey={activeTab}
          onSelectionChange={handleTabSelection}
        >
          <Tabs.ListContainer className="sidebar-tab-strip">
            <Tabs.List aria-label="侧栏选项" className="sidebar-tab-list">
              {TAB_ITEMS.map(({ key, label, Icon }) => (
                <Tabs.Tab key={key} id={key} className="sidebar-tab-item">
                  <Icon size={16} />
                  <span>{label}</span>
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <div className="sidebar-panels">
          <div
            id="chat-panel"
            role="tabpanel"
            aria-labelledby="chat"
            aria-hidden={activeTab !== "chat"}
            className="sidebar-panel"
            style={{ display: activeTab === "chat" ? "block" : "none" }}
          >
            <ChatSidebar
              isOpen={true}
              onClose={onClose}
              currentProjectId={currentProjectId}
            />
          </div>

          <div
            id="settings-panel"
            role="tabpanel"
            aria-labelledby="settings"
            aria-hidden={activeTab !== "settings"}
            className="sidebar-panel"
            style={{ display: activeTab === "settings" ? "block" : "none" }}
          >
            <SettingsSidebar
              isOpen={true}
              onClose={onClose}
              onSettingsChange={onSettingsChange}
            />
          </div>

          <div
            id="version-panel"
            role="tabpanel"
            aria-labelledby="version"
            aria-hidden={activeTab !== "version"}
            className="sidebar-panel"
            style={{ display: activeTab === "version" ? "block" : "none" }}
          >
            <VersionSidebar
              projectUuid={projectUuid || null}
              onVersionRestore={onVersionRestore}
              editorRef={editorRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

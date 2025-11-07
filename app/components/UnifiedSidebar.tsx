"use client";

import { useState, useEffect } from "react";
import ChatSidebar from "./ChatSidebar";
import SettingsSidebar from "./SettingsSidebar";
import { useStorageSettings } from "@/app/hooks/useStorageSettings";

interface UnifiedSidebarProps {
  isOpen: boolean;
  activeSidebar: "none" | "settings" | "chat";
  onClose: () => void;
  onSettingsChange?: (settings: { defaultPath: string }) => void;
}

export default function UnifiedSidebar({
  isOpen,
  activeSidebar,
  onClose,
  onSettingsChange,
}: UnifiedSidebarProps) {
  // 存储 Hook
  const { getSetting, setSetting } = useStorageSettings();

  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // 从存储恢复侧栏宽度
  useEffect(() => {
    const loadWidth = async () => {
      try {
        const savedWidth = await getSetting("unifiedSidebarWidth");
        if (savedWidth) {
          const width = parseInt(savedWidth);
          setSidebarWidth(width);
          document.documentElement.style.setProperty(
            "--sidebar-width",
            `${width}px`
          );
        }
      } catch (e) {
        console.error("加载侧栏宽度失败:", e);
      }
    };

    loadWidth();
  }, [getSetting]);

  // 拖拽调整宽度
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setSidebarWidth(newWidth);
        document.documentElement.style.setProperty(
          "--sidebar-width",
          `${newWidth}px`
        );
      }
    };

    const handleMouseUp = async () => {
      if (isResizing) {
        setIsResizing(false);
        try {
          await setSetting("unifiedSidebarWidth", sidebarWidth.toString());
        } catch (e) {
          console.error("保存侧栏宽度失败:", e);
        }
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, sidebarWidth, setSetting]);

  return (
    <div
      className={`unified-sidebar ${isOpen ? "open" : ""} ${
        isResizing ? "resizing" : ""
      }`}
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* 拖拽分隔条 */}
      <div className="resize-handle" onMouseDown={handleMouseDown} />

      {/* 根据 activeSidebar 渲染不同内容 */}
      {activeSidebar === "settings" && (
        <SettingsSidebar
          isOpen={true}
          onClose={onClose}
          onSettingsChange={onSettingsChange}
        />
      )}
      {activeSidebar === "chat" && (
        <ChatSidebar isOpen={true} onClose={onClose} />
      )}
    </div>
  );
}

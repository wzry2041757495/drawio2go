"use client";

import { useState, useEffect } from "react";
import ChatSidebar from "./ChatSidebar";
import SettingsSidebar from "./SettingsSidebar";

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
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // 从 localStorage 恢复侧栏宽度
  useEffect(() => {
    const savedWidth = localStorage.getItem("unifiedSidebarWidth");
    if (savedWidth) {
      const width = parseInt(savedWidth);
      setSidebarWidth(width);
      document.documentElement.style.setProperty(
        "--sidebar-width",
        `${width}px`
      );
    }
  }, []);

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

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem("unifiedSidebarWidth", sidebarWidth.toString());
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
  }, [isResizing, sidebarWidth]);

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

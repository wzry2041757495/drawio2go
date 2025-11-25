"use client";

import { Button, TooltipContent, TooltipRoot } from "@heroui/react";
import { Download, History, Trash2 } from "lucide-react";
import type { ChatSession } from "@/app/types/chat";

interface ChatSessionHeaderProps {
  activeSession: ChatSession | null;
  isSaving?: boolean;
  saveError?: string | null;
  onHistoryClick: () => void;
  onDeleteSession: () => void;
  onExportSession: () => void;
  onExportAllSessions: () => void;
}

export default function ChatSessionHeader({
  activeSession,
  isSaving = false,
  saveError = null,
  onHistoryClick,
  onDeleteSession,
  onExportSession,
  onExportAllSessions,
}: ChatSessionHeaderProps) {
  if (!activeSession) {
    return null;
  }

  return (
    <div className="chat-session-header">
      <div className="chat-session-title-wrapper">
        <div className="chat-session-title-block">
          <span className="chat-session-title">{activeSession.title}</span>
          <span className="chat-session-meta">
            {activeSession.messages.length} 条消息
            {isSaving && (
              <span className="chat-session-meta-status"> · 保存中...</span>
            )}
            {!isSaving && saveError && (
              <span className="chat-session-meta-error">
                {" "}
                · 保存失败，将自动重试
              </span>
            )}
          </span>
        </div>
        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="secondary"
            onPress={onHistoryClick}
            aria-label="查看历史对话"
          >
            <History size={16} />
            历史
          </Button>
          <TooltipContent placement="bottom">查看历史对话</TooltipContent>
        </TooltipRoot>
      </div>
      <div className="chat-session-actions">
        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="danger"
            isIconOnly
            aria-label="删除会话"
            onPress={onDeleteSession}
          >
            <Trash2 size={16} />
          </Button>
          <TooltipContent placement="top">
            <p>删除会话</p>
          </TooltipContent>
        </TooltipRoot>

        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="tertiary"
            isIconOnly
            aria-label="导出当前会话"
            onPress={onExportSession}
          >
            <Download size={16} />
          </Button>
          <TooltipContent placement="top">
            <p>导出当前会话</p>
          </TooltipContent>
        </TooltipRoot>

        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="tertiary"
            aria-label="导出所有会话"
            onPress={onExportAllSessions}
          >
            <Download size={16} />
            全部导出
          </Button>
          <TooltipContent placement="top">
            <p>导出所有会话</p>
          </TooltipContent>
        </TooltipRoot>
      </div>
    </div>
  );
}

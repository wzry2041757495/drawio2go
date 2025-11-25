"use client";

import {
  Button,
  TooltipContent,
  TooltipRoot,
  type ButtonProps,
} from "@heroui/react";

interface ChatInputActionsProps {
  isSendDisabled: boolean;
  isChatStreaming: boolean;
  onCancel?: () => void;
  onNewChat: () => void;
  onHistory: () => void;
}

export default function ChatInputActions({
  isSendDisabled,
  isChatStreaming,
  onCancel,
  onNewChat,
  onHistory,
}: ChatInputActionsProps) {
  const canCancel = Boolean(isChatStreaming && onCancel);
  const sendButtonVariant: ButtonProps["variant"] = canCancel
    ? "danger"
    : "primary";
  const sendButtonType = canCancel ? undefined : "submit";
  const sendButtonDisabled = canCancel
    ? false
    : isChatStreaming
      ? true
      : isSendDisabled;

  return (
    <div className="chat-input-actions">
      {/* 左侧按钮组 */}
      <div className="chat-actions-left">
        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="tertiary"
            isIconOnly
            aria-label="新建聊天"
            onPress={onNewChat}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </Button>
          <TooltipContent placement="top">
            <p>新建聊天</p>
          </TooltipContent>
        </TooltipRoot>

        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="tertiary"
            isIconOnly
            aria-label="历史对话"
            onPress={onHistory}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v5h5"></path>
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path>
              <path d="M12 7v5l4 2"></path>
            </svg>
          </Button>
          <TooltipContent placement="top">
            <p>历史对话</p>
          </TooltipContent>
        </TooltipRoot>
      </div>

      {/* 右侧按钮组 */}
      <div className="chat-actions-right">
        <Button
          type={sendButtonType}
          variant={sendButtonVariant}
          size="sm"
          isDisabled={sendButtonDisabled}
          onPress={canCancel ? onCancel : undefined}
        >
          {canCancel ? (
            // 取消图标（X）
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          ) : (
            // 发送图标
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          )}
          {canCancel ? "取消" : "发送"}
        </Button>
      </div>
    </div>
  );
}

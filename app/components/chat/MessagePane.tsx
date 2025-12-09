"use client";

import MessageList from "./MessageList";
import type { ChatUIMessage, LLMConfig } from "@/app/types/chat";

interface MessagePaneProps {
  messages: ChatUIMessage[];
  configLoading: boolean;
  llmConfig: LLMConfig | null;
  status: string;
  expandedToolCalls: Record<string, boolean>;
  expandedThinkingBlocks: Record<string, boolean>;
  onToolCallToggle: (key: string) => void;
  onThinkingBlockToggle: (messageId: string) => void;
}

/**
 * 消息展示区域容器
 *
 * 包装 MessageList，保持现有的滚动与布局样式。
 */
export default function MessagePane({
  messages,
  configLoading,
  llmConfig,
  status,
  expandedToolCalls,
  expandedThinkingBlocks,
  onToolCallToggle,
  onThinkingBlockToggle,
}: MessagePaneProps) {
  return (
    <div className="chat-messages-area">
      <MessageList
        messages={messages}
        configLoading={configLoading}
        llmConfig={llmConfig}
        status={status}
        expandedToolCalls={expandedToolCalls}
        expandedThinkingBlocks={expandedThinkingBlocks}
        onToolCallToggle={onToolCallToggle}
        onThinkingBlockToggle={onThinkingBlockToggle}
      />
    </div>
  );
}

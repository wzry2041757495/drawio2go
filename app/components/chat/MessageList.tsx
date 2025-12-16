"use client";

import { useRef, useEffect, useState } from "react";
import { Skeleton } from "@heroui/react";
import { type LLMConfig, type ChatUIMessage } from "@/app/types/chat";
import EmptyState from "./EmptyState";
import MessageItem from "./MessageItem";

const SCROLL_BOTTOM_THRESHOLD = 50;

interface MessageListProps {
  messages: ChatUIMessage[];
  configLoading: boolean;
  llmConfig: LLMConfig | null;
  status: string;
  expandedToolCalls: Record<string, boolean>;
  expandedThinkingBlocks: Record<string, boolean>;
  onToolCallToggle: (key: string) => void;
  onThinkingBlockToggle: (messageId: string) => void;
}

export default function MessageList({
  messages,
  configLoading,
  llmConfig,
  status,
  expandedToolCalls,
  expandedThinkingBlocks,
  onToolCallToggle,
  onThinkingBlockToggle,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const skeletonItems = Array.from({ length: 3 });

  // 监听消息内容与流式状态变化，自动滚动到底部（支持流式追加而不改变长度的场景）
  useEffect(() => {
    if (messages.length === 0 || !isAutoScrollEnabled) return;

    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [isAutoScrollEnabled, messages, status]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom < SCROLL_BOTTOM_THRESHOLD;

    setIsAutoScrollEnabled((prev) => {
      if (isNearBottom && !prev) return true;
      if (!isNearBottom && prev) return false;
      return prev;
    });
  };

  // 渲染空状态
  if (configLoading) {
    return (
      <div className="messages-scroll-area">
        {skeletonItems.map((_, index) => (
          <div key={`message-skeleton-${index}`} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!llmConfig) {
    return <EmptyState type="no-config" />;
  }

  if (messages.length === 0) {
    return <EmptyState type="no-messages" />;
  }

  // 检查是否正在流式传输且需要显示临时AI消息
  const isStreaming = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const shouldShowPlaceholderAI = isStreaming && lastMessage?.role === "user";

  // 识别当前正在流式生成的消息
  const getCurrentStreamingMessageId = () => {
    if (!isStreaming) return null;
    if (lastMessage?.role === "assistant") return lastMessage.id;
    return "temp-ai-placeholder";
  };
  const currentStreamingMessageId = getCurrentStreamingMessageId();

  // 创建临时的空白AI消息（用于显示打字指示器）
  const placeholderAIMessage: ChatUIMessage = {
    id: "temp-ai-placeholder",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "",
      },
    ],
    metadata: {
      modelName: llmConfig?.modelName,
      createdAt: Date.now(),
    },
  };

  // 渲染消息列表
  return (
    <div
      className="messages-scroll-area"
      ref={scrollContainerRef}
      onScroll={handleScroll}
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          status={status}
          isCurrentStreaming={message.id === currentStreamingMessageId}
          expandedToolCalls={expandedToolCalls}
          expandedThinkingBlocks={expandedThinkingBlocks}
          onToolCallToggle={onToolCallToggle}
          onThinkingBlockToggle={onThinkingBlockToggle}
        />
      ))}
      {/* 流式传输时显示临时AI消息（带打字指示器） */}
      {shouldShowPlaceholderAI && (
        <MessageItem
          key="temp-ai-placeholder"
          message={placeholderAIMessage}
          status={status}
          isCurrentStreaming={true}
          expandedToolCalls={expandedToolCalls}
          expandedThinkingBlocks={expandedThinkingBlocks}
          onToolCallToggle={onToolCallToggle}
          onThinkingBlockToggle={onThinkingBlockToggle}
        />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

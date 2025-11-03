"use client";

import { useRef } from "react";
import EmptyState from "./EmptyState";
import MessageItem from "./MessageItem";

interface Message {
  id: string;
  role: "user" | "assistant";
  parts: any[];
  createdAt?: Date;
}

interface MessageListProps {
  messages: Message[];
  configLoading: boolean;
  llmConfig: any;
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

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 监听消息变化，自动滚动到底部
  if (messages.length > 0) {
    setTimeout(scrollToBottom, 100);
  }

  // 渲染空状态
  if (configLoading) {
    return <EmptyState type="loading" />;
  }

  if (!llmConfig) {
    return <EmptyState type="no-config" />;
  }

  if (messages.length === 0) {
    return <EmptyState type="no-messages" />;
  }

  // 渲染消息列表
  return (
    <div className="messages-scroll-area">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          status={status}
          expandedToolCalls={expandedToolCalls}
          expandedThinkingBlocks={expandedThinkingBlocks}
          onToolCallToggle={onToolCallToggle}
          onThinkingBlockToggle={onThinkingBlockToggle}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
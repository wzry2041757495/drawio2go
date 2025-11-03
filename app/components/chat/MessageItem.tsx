"use client";

import MessageContent from "./MessageContent";

interface Message {
  id: string;
  role: "user" | "assistant";
  parts: any[];
  createdAt?: Date;
}

interface MessageItemProps {
  message: Message;
  status: string;
  expandedToolCalls: Record<string, boolean>;
  expandedThinkingBlocks: Record<string, boolean>;
  onToolCallToggle: (key: string) => void;
  onThinkingBlockToggle: (messageId: string) => void;
}

export default function MessageItem({
  message,
  status,
  expandedToolCalls,
  expandedThinkingBlocks,
  onToolCallToggle,
  onThinkingBlockToggle,
}: MessageItemProps) {
  return (
    <div
      className={`message ${
        message.role === "user" ? "message-user" : "message-ai"
      }`}
    >
      <div className="message-header">
        <span className="message-role">
          {message.role === "user" ? "你" : "AI"}
        </span>
        <span className="message-time">
          {new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="message-content">
        <MessageContent
          message={message}
          expandedToolCalls={expandedToolCalls}
          expandedThinkingBlocks={expandedThinkingBlocks}
          onToolCallToggle={onToolCallToggle}
          onThinkingBlockToggle={onThinkingBlockToggle}
        />
      </div>
    </div>
  );
}
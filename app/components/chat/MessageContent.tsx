"use client";

import ReactMarkdown from "react-markdown";
import ThinkingBlock from "./ThinkingBlock";
import ToolCallCard from "./ToolCallCard";
import { markdownComponents } from "./constants/markdownComponents";
import { getToolExpansionKey, shouldToolBeExpanded } from "./utils/toolUtils";
import { type ToolMessagePart } from "./constants/toolConstants";

interface Message {
  id: string;
  role: "user" | "assistant";
  parts: any[];
  createdAt?: Date;
}

interface MessageContentProps {
  message: Message;
  expandedToolCalls: Record<string, boolean>;
  expandedThinkingBlocks: Record<string, boolean>;
  onToolCallToggle: (key: string) => void;
  onThinkingBlockToggle: (messageId: string) => void;
}

export default function MessageContent({
  message,
  expandedToolCalls,
  expandedThinkingBlocks,
  onToolCallToggle,
  onThinkingBlockToggle,
}: MessageContentProps) {
  return (
    <>
      {/* 渲染消息部分 */}
      {message.parts.map((part: any, index: number) => {
        // 思考内容
        if (part.type === "reasoning") {
          const isReasoningStreaming = part.state === 'streaming';
          return (
            <ThinkingBlock
              key={`${message.id}-${index}`}
              reasoning={part.text ?? ""}
              isStreaming={isReasoningStreaming}
              expanded={expandedThinkingBlocks[message.id] ?? false}
              onToggle={() => onThinkingBlockToggle(message.id)}
            />
          );
        }

        // 文本内容
        if (part.type === "text") {
          return (
            <div key={`${message.id}-${index}`} className="message-markdown">
              <ReactMarkdown components={markdownComponents}>
                {part.text ?? ""}
              </ReactMarkdown>
            </div>
          );
        }

        // 工具调用内容
        const normalizedPart: ToolMessagePart =
          part.type === "dynamic-tool"
            ? {
                ...part,
                type: `tool-${part.toolName}`,
              }
            : (part as ToolMessagePart);

        if (
          typeof normalizedPart.type === "string" &&
          normalizedPart.type.startsWith("tool-")
        ) {
          const expansionKey = getToolExpansionKey(
            message.id,
            index,
            normalizedPart.toolCallId,
            normalizedPart.state
          );
          const isExpanded =
            expandedToolCalls[expansionKey] ?? shouldToolBeExpanded(normalizedPart.state);

          return (
            <ToolCallCard
              key={expansionKey}
              part={normalizedPart}
              expanded={isExpanded}
              onToggle={() => onToolCallToggle(expansionKey)}
            />
          );
        }

        return null;
      })}
    </>
  );
}
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
  reasoning: string;
  isStreaming: boolean;
  expandedToolCalls: Record<string, boolean>;
  expandedThinkingBlocks: Record<string, boolean>;
  onToolCallToggle: (key: string) => void;
  onThinkingBlockToggle: (messageId: string) => void;
}

export default function MessageContent({
  message,
  reasoning,
  isStreaming,
  expandedToolCalls,
  expandedThinkingBlocks,
  onToolCallToggle,
  onThinkingBlockToggle,
}: MessageContentProps) {
  return (
    <>
      {/* 如果有思考内容，先渲染思考框 */}
      {reasoning && message.role === 'assistant' && (
        <ThinkingBlock
          reasoning={reasoning}
          isStreaming={isStreaming}
          expanded={expandedThinkingBlocks[message.id] ?? false}
          onToggle={() => onThinkingBlockToggle(message.id)}
        />
      )}

      {/* 渲染消息部分 */}
      {message.parts.map((part: any, index: number) => {
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
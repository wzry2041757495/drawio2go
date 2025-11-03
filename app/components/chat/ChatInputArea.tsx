"use client";

import { type FormEvent } from "react";
import { Button } from "@heroui/react";
import ErrorBanner from "./ErrorBanner";
import ChatInputActions from "./ChatInputActions";

interface ChatInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  isChatStreaming: boolean;
  configLoading: boolean;
  llmConfig: any;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNewChat: () => void;
  onHistory: () => void;
  onVersionControl: () => void;
  onFileUpload: () => void;
}

export default function ChatInputArea({
  input,
  setInput,
  isChatStreaming,
  configLoading,
  llmConfig,
  error,
  onSubmit,
  onNewChat,
  onHistory,
  onVersionControl,
  onFileUpload,
}: ChatInputAreaProps) {
  const isSendDisabled = !input.trim() || isChatStreaming || configLoading || !llmConfig;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSendDisabled) {
        onSubmit(event as any);
      }
    }
  };

  return (
    <div className="chat-input-area">
      <ErrorBanner error={error} />

      <form onSubmit={onSubmit} className="chat-input-container">
        {/* 多行文本输入框 */}
        <textarea
          placeholder="描述你想要对图表进行的修改，或上传（粘贴）图像来复制图表..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="chat-input-textarea"
          rows={3}
          disabled={configLoading || !llmConfig}
          onKeyDown={handleKeyDown}
        />

        {/* 按钮组 */}
        <ChatInputActions
          isSendDisabled={isSendDisabled}
          isChatStreaming={isChatStreaming}
          onNewChat={onNewChat}
          onHistory={onHistory}
          onVersionControl={onVersionControl}
          onFileUpload={onFileUpload}
        />
      </form>
    </div>
  );
}
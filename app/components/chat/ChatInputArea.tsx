"use client";

import { type FormEvent, type KeyboardEvent } from "react";
import { TextArea } from "@heroui/react";
import {
  type LLMConfig,
  type ModelConfig,
  type ProviderConfig,
} from "@/app/types/chat";
import ChatInputActions from "./ChatInputActions";
import { useAppTranslation } from "@/app/i18n/hooks";

interface ChatInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  isChatStreaming: boolean;
  configLoading: boolean;
  llmConfig: LLMConfig | null;
  canSendNewMessage: boolean;
  lastMessageIsUser: boolean;
  isOnline: boolean;
  isSocketConnected: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  onNewChat: () => void;
  onHistory: () => void;
  onRetry: () => void;
  modelSelectorProps: {
    providers: ProviderConfig[];
    models: ModelConfig[];
    selectedModelId: string | null;
    onSelectModel: (modelId: string) => Promise<void> | void;
    isDisabled: boolean;
    isLoading: boolean;
    modelLabel: string;
  };
}

export default function ChatInputArea({
  input,
  setInput,
  isChatStreaming,
  configLoading,
  llmConfig,
  canSendNewMessage,
  lastMessageIsUser,
  isOnline,
  isSocketConnected,
  onSubmit,
  onCancel,
  onNewChat,
  onHistory,
  onRetry,
  modelSelectorProps,
}: ChatInputAreaProps) {
  const { t } = useAppTranslation("chat");
  const isSendDisabled =
    !input.trim() ||
    isChatStreaming ||
    configLoading ||
    !llmConfig ||
    !canSendNewMessage ||
    !isOnline ||
    !isSocketConnected;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSendDisabled) {
        const formEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(formEvent, "target", {
          value: event.currentTarget.form,
          enumerable: true,
        });
        onSubmit(formEvent as unknown as FormEvent<HTMLFormElement>);
      }
    }
  };

  return (
    <div className="chat-input-area">
      <form onSubmit={onSubmit} className="chat-input-container">
        {/* 多行文本输入框 */}
        <TextArea
          placeholder={t("input.placeholder")}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
          disabled={
            configLoading ||
            !llmConfig ||
            !canSendNewMessage ||
            !isOnline ||
            !isSocketConnected
          }
          onKeyDown={handleKeyDown}
          className="w-full"
          aria-label={t("aria.input")}
        />

        {!isSocketConnected ? (
          <div className="chat-network-status" role="status" aria-live="polite">
            ⚠️ {t("status.socketDisconnected")} ·{" "}
            {t("status.socketRequiredForChat")}
          </div>
        ) : null}

        {isSocketConnected && !isOnline && (
          <div className="chat-network-status" role="status" aria-live="polite">
            ⚠️ {t("status.networkOfflineShort", "网络已断开")} ·{" "}
            {t("status.networkDisconnectedHint")}
          </div>
        )}

        {/* 按钮组 */}
        <ChatInputActions
          isSendDisabled={isSendDisabled}
          isChatStreaming={isChatStreaming}
          canSendNewMessage={canSendNewMessage}
          lastMessageIsUser={lastMessageIsUser}
          isOnline={isOnline}
          isSocketConnected={isSocketConnected}
          onCancel={onCancel}
          onNewChat={onNewChat}
          onHistory={onHistory}
          onRetry={onRetry}
          modelSelectorProps={modelSelectorProps}
        />
      </form>
    </div>
  );
}

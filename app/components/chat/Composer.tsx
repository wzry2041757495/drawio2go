"use client";

import type { FormEvent } from "react";
import ChatInputArea from "./ChatInputArea";
import type { LLMConfig, ModelConfig, ProviderConfig } from "@/app/types/chat";

interface ComposerProps {
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

/**
 * 底部输入区域容器
 *
 * 将原有 ChatInputArea 的 props 聚合，便于 ChatSidebar 精简结构。
 */
export default function Composer(props: ComposerProps) {
  return <ChatInputArea {...props} />;
}

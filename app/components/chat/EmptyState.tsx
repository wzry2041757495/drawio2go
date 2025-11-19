"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2, MessageSquarePlus, Settings2 } from "lucide-react";

interface EmptyStateProps {
  type: "loading" | "no-config" | "no-messages";
}

const EMPTY_STATE_CONTENT: Record<
  EmptyStateProps["type"],
  { Icon: LucideIcon; text: string; hint: string }
> = {
  loading: {
    Icon: Loader2,
    text: "正在加载 LLM 配置",
    hint: "请稍候...",
  },
  "no-config": {
    Icon: Settings2,
    text: "尚未配置 AI 供应商",
    hint: "请在设置中保存连接参数后重试",
  },
  "no-messages": {
    Icon: MessageSquarePlus,
    text: "开始与 AI 助手对话",
    hint: "输入消息开始聊天",
  },
};

export default function EmptyState({ type }: EmptyStateProps) {
  const { Icon, text, hint } =
    EMPTY_STATE_CONTENT[type] ?? EMPTY_STATE_CONTENT["no-messages"];

  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden>
        <Icon size={28} />
      </span>
      <p className="empty-text">{text}</p>
      <p className="empty-hint">{hint}</p>
    </div>
  );
}

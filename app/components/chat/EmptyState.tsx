"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2, MessageSquarePlus, Settings2 } from "lucide-react";
import { useAppTranslation } from "@/app/i18n/hooks";

interface EmptyStateProps {
  type: "loading" | "no-config" | "no-messages";
}

const EMPTY_STATE_CONTENT: Record<
  EmptyStateProps["type"],
  { Icon: LucideIcon; text: string; hint: string }
> = {
  loading: {
    Icon: Loader2,
    text: "",
    hint: "",
  },
  "no-config": {
    Icon: Settings2,
    text: "",
    hint: "",
  },
  "no-messages": {
    Icon: MessageSquarePlus,
    text: "",
    hint: "",
  },
};

export default function EmptyState({ type }: EmptyStateProps) {
  const { t } = useAppTranslation("chat");
  const content = {
    loading: {
      Icon: EMPTY_STATE_CONTENT.loading.Icon,
      text: t("messages.emptyStates.loading.title"),
      hint: t("messages.emptyStates.loading.hint"),
    },
    "no-config": {
      Icon: EMPTY_STATE_CONTENT["no-config"].Icon,
      text: t("messages.emptyStates.noConfig.title"),
      hint: t("messages.emptyStates.noConfig.hint"),
    },
    "no-messages": {
      Icon: EMPTY_STATE_CONTENT["no-messages"].Icon,
      text: t("messages.emptyStates.noMessages.title"),
      hint: t("messages.emptyStates.noMessages.hint"),
    },
  } satisfies typeof EMPTY_STATE_CONTENT;

  const { Icon, text, hint } = content[type] ?? content["no-messages"];

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

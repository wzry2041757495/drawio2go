"use client";

import { Button, TooltipContent, TooltipRoot } from "@heroui/react";
import { Download, History, Trash2 } from "lucide-react";
import type { ChatSession } from "@/app/types/chat";
import { useAppTranslation } from "@/app/i18n/hooks";

interface ChatSessionHeaderProps {
  activeSession: ChatSession | null;
  isSaving?: boolean;
  saveError?: string | null;
  onHistoryClick: () => void;
  onDeleteSession: () => void;
  onExportSession: () => void;
  onExportAllSessions: () => void;
}

export default function ChatSessionHeader({
  activeSession,
  isSaving = false,
  saveError = null,
  onHistoryClick,
  onDeleteSession,
  onExportSession,
  onExportAllSessions,
}: ChatSessionHeaderProps) {
  const { t } = useAppTranslation(["chat", "common"]);

  if (!activeSession) {
    return null;
  }

  const messageCountLabel = t("messages.counts.messageCount", {
    count: activeSession.messages.length,
  });

  const savingLabel = t("messages.saving");
  const savedLabel = t("messages.saved");
  const saveErrorLabel = t("common:toasts.autoSaveFailed");

  return (
    <div className="chat-session-header">
      <div className="chat-session-title-wrapper">
        <div className="chat-session-title-block">
          <span className="chat-session-title">{activeSession.title}</span>
          <span className="chat-session-meta">
            {messageCountLabel}
            {isSaving && (
              <span className="chat-session-meta-status"> · {savingLabel}</span>
            )}
            {!isSaving && saveError && (
              <span className="chat-session-meta-error">
                {" "}
                · {saveErrorLabel}
              </span>
            )}
            {!isSaving && !saveError && (
              <span className="chat-session-meta-status"> · {savedLabel}</span>
            )}
          </span>
        </div>
        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="secondary"
            onPress={onHistoryClick}
            aria-label={t("aria.history")}
          >
            <History size={16} />
            {t("sidebar.history")}
          </Button>
          <TooltipContent placement="bottom">
            {t("sidebar.history")}
          </TooltipContent>
        </TooltipRoot>
      </div>
      <div className="chat-session-actions">
        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="danger"
            isIconOnly
            aria-label={t("aria.delete")}
            onPress={onDeleteSession}
          >
            <Trash2 size={16} />
          </Button>
          <TooltipContent placement="top">
            <p>{t("conversations.actions.delete")}</p>
          </TooltipContent>
        </TooltipRoot>

        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="tertiary"
            isIconOnly
            aria-label={t("aria.export")}
            onPress={onExportSession}
          >
            <Download size={16} />
          </Button>
          <TooltipContent placement="top">
            <p>{t("conversations.actions.export")}</p>
          </TooltipContent>
        </TooltipRoot>

        <TooltipRoot delay={0}>
          <Button
            size="sm"
            variant="tertiary"
            aria-label={t("aria.export")}
            onPress={onExportAllSessions}
          >
            <Download size={16} />
            {t("conversations.actions.exportAll")}
          </Button>
          <TooltipContent placement="top">
            <p>{t("conversations.actions.exportAll")}</p>
          </TooltipContent>
        </TooltipRoot>
      </div>
    </div>
  );
}

"use client";

import { Card, Checkbox, Button } from "@heroui/react";
import { Eye, MessagesSquare } from "lucide-react";
import type { Conversation } from "@/app/lib/storage";
import {
  formatConversationDate,
  formatRelativeTime,
} from "@/app/lib/format-utils";
import { useAppTranslation } from "@/app/i18n/hooks";

interface ConversationListProps {
  conversations: Conversation[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (id: string) => void;
  onOpenConversation: (id: string) => void;
}

export default function ConversationList({
  conversations,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onPreview,
  onOpenConversation,
}: ConversationListProps) {
  const { t, i18n } = useAppTranslation(["chat", "common"]);

  if (!conversations || conversations.length === 0) {
    return (
      <div className="history-empty">
        <MessagesSquare size={32} />
        <p className="history-empty__title">{t("history.search.noResults")}</p>
        <p className="history-empty__hint">{t("errors.noResult")}</p>
      </div>
    );
  }

  return (
    <div className="history-list" role="list">
      {conversations.map((conv, index) => {
        const fallbackTitle = t("conversations.defaultName", {
          number: index + 1,
        });
        const title = conv.title || fallbackTitle;
        const isSelected = selectedIds.has(conv.id);
        const relativeTime = formatRelativeTime(
          conv.updated_at ?? conv.created_at,
          t,
        );

        return (
          <Card.Root
            key={conv.id}
            className="history-card"
            data-selected={isSelected}
            role="listitem"
          >
            <Card.Content className="history-card__content">
              {selectionMode && (
                <Checkbox
                  aria-label={t("aria.selectConversation", { title })}
                  isSelected={isSelected}
                  onChange={() => onToggleSelect(conv.id)}
                />
              )}

              <div
                className="history-card__body"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (selectionMode) {
                      onToggleSelect(conv.id);
                    } else {
                      onOpenConversation(conv.id);
                    }
                  }
                }}
                onClick={() =>
                  selectionMode
                    ? onToggleSelect(conv.id)
                    : onOpenConversation(conv.id)
                }
              >
                <div className="history-card__meta">
                  <div className="history-card__title" title={title}>
                    {title}
                  </div>
                  <div className="history-card__subtitle">
                    <span>
                      {t("conversations.lastUpdated", { time: relativeTime })}
                    </span>
                    <span className="history-card__dot" aria-hidden>
                      •
                    </span>
                    <span>
                      {t("conversations.createdAt", {
                        time: formatConversationDate(
                          conv.created_at,
                          "date",
                          i18n.language,
                        ),
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {!selectionMode && (
                <div className="history-card__actions">
                  <Button
                    size="sm"
                    variant="tertiary"
                    aria-label={t("aria.openPreview")}
                    onPress={() => onPreview(conv.id)}
                  >
                    <Eye size={16} />
                    {t("aria.openPreview")}
                  </Button>
                </div>
              )}
            </Card.Content>
          </Card.Root>
        );
      })}
    </div>
  );
}

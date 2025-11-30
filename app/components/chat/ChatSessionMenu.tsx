"use client";

import type { ChatSessionsData } from "@/app/types/chat";
import { formatConversationDate } from "@/app/lib/format-utils";
import { useAppTranslation } from "@/app/i18n/hooks";

interface ChatSessionMenuProps {
  showSessionMenu: boolean;
  sessionsData: ChatSessionsData | null;
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
}

export default function ChatSessionMenu({
  showSessionMenu,
  sessionsData,
  activeSessionId,
  onSessionSelect,
}: ChatSessionMenuProps) {
  const { t, i18n } = useAppTranslation("chat");
  if (!showSessionMenu || !sessionsData) {
    return null;
  }

  return (
    <div className="chat-session-menu">
      {sessionsData.sessionOrder.map((sessionId, index) => {
        const session = sessionsData.sessions[sessionId];
        const isActive = sessionId === activeSessionId;
        const sessionTitle =
          session.title ||
          t("conversations.defaultName", { number: index + 1 });

        return (
          <button
            key={sessionId}
            type="button"
            className={`chat-session-menu-item ${isActive ? "chat-session-menu-item--active" : ""}`}
            onClick={() => onSessionSelect(sessionId)}
          >
            <div className="chat-session-menu-item-title">{sessionTitle}</div>
            <div className="chat-session-menu-item-meta">
              {t("messages.counts.messageCount", {
                count: session.messages.length,
              })}{" "}
              ·{" "}
              {formatConversationDate(session.updatedAt, "date", i18n.language)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

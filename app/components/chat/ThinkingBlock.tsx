"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useAppTranslation } from "@/app/i18n/hooks";

interface ThinkingBlockProps {
  reasoning: string;
  isStreaming: boolean;
  expanded: boolean;
  onToggle: () => void;
}

export default function ThinkingBlock({
  reasoning,
  isStreaming,
  expanded,
  onToggle,
}: ThinkingBlockProps) {
  const { t } = useAppTranslation("chat");
  const Icon = isStreaming ? Loader2 : Sparkles;
  const iconClassName = `thinking-block-icon ${
    isStreaming ? "thinking-block-icon--spinning" : ""
  }`.trim();

  return (
    <div
      className={`thinking-block ${isStreaming ? "thinking-block--active" : "thinking-block--completed"} ${expanded ? "thinking-block--expanded" : ""}`.trim()}
    >
      <button
        type="button"
        className="thinking-block-header"
        onClick={onToggle}
      >
        <div className="thinking-block-title">
          <span className={iconClassName} aria-hidden>
            <Icon size={16} />
          </span>
          <span>
            {isStreaming
              ? t("messages.thinking.streaming")
              : t("messages.thinking.title")}
          </span>
        </div>
        <svg
          className={`thinking-block-chevron ${expanded ? "thinking-block-chevron--open" : ""}`.trim()}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="thinking-block-body">
          <pre className="thinking-block-content">
            {reasoning || t("messages.thinking.empty")}
          </pre>
        </div>
      )}
    </div>
  );
}

"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppTranslation } from "@/app/i18n/hooks";

interface ThinkingBlockProps {
  reasoning: string;
  isStreaming: boolean;
  durationMs?: number;
  expanded: boolean;
  onToggle: () => void;
}

export default function ThinkingBlock({
  reasoning,
  isStreaming,
  durationMs,
  expanded,
  onToggle,
}: ThinkingBlockProps) {
  const { t } = useAppTranslation("chat");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isMountedRef = useRef(true);
  const Icon = isStreaming ? Loader2 : Sparkles;
  const iconClassName = `thinking-block-icon ${
    isStreaming ? "thinking-block-icon--spinning" : ""
  }`.trim();

  useEffect(() => {
    if (!isStreaming) return;

    const start = performance.now();
    setElapsedSeconds(0);

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((performance.now() - start) / 1000);
    }, 100);

    return () => {
      clearInterval(intervalId);
      if (isMountedRef.current) {
        setElapsedSeconds((performance.now() - start) / 1000);
      }
    };
  }, [isStreaming]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const persistedSeconds =
    !isStreaming && typeof durationMs === "number"
      ? Math.max(0, durationMs / 1000)
      : null;
  const displaySeconds = persistedSeconds ?? Math.max(0, elapsedSeconds ?? 0);
  const formattedElapsed = displaySeconds.toFixed(1);
  const showTimer = isStreaming || displaySeconds > 0;

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
          {showTimer && (
            <span className="thinking-block-timer" aria-live="polite">
              {t("messages.thinking.timer", { seconds: formattedElapsed })}
            </span>
          )}
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

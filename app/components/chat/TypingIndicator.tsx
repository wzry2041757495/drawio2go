"use client";

import React from "react";
import "./typing-indicator.css";
import { useAppTranslation } from "@/app/i18n/hooks";

/**
 * AI打字机效果指示器组件
 * 显示一个脉冲缩放的圆点，表示AI正在输出内容
 */
export const TypingIndicator: React.FC = () => {
  const { t } = useAppTranslation("chat");
  return (
    <span className="typing-indicator" aria-label={t("messages.typing")}>
      <span className="typing-dot"></span>
    </span>
  );
};

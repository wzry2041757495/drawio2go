"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { type ToolMessagePart } from "./constants/toolConstants";
import {
  getToolTitle,
  getToolSummary,
  getToolStatusMeta,
} from "./utils/toolUtils";
import { useAppTranslation } from "@/app/i18n/hooks";

interface ToolCallCardProps {
  part: ToolMessagePart;
  expanded: boolean;
  onToggle: () => void;
}

export default function ToolCallCard({
  part,
  expanded,
  onToggle,
}: ToolCallCardProps) {
  const { t } = useAppTranslation("chat");
  const title = getToolTitle(part.type, t);
  const meta = getToolStatusMeta(part.state, t);
  const StatusIcon = meta.Icon;
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedError, setCopiedError] = useState(false);

  const showInput = Boolean(part.input);
  const showOutput = Boolean(part.output);

  // 判断是否为进行中状态（正在调用或等待执行）
  const isInProgress =
    part.state === "input-streaming" || part.state === "input-available";

  // 复制输入参数
  const handleCopyInput = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(part.input, null, 2));
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 2000);
    } catch (error) {
      console.error("[ToolCallCard] copy input failed:", error);
    }
  };

  // 复制输出结果
  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(part.output, null, 2));
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    } catch (error) {
      console.error("[ToolCallCard] copy output failed:", error);
    }
  };

  // 复制错误信息
  const handleCopyError = async () => {
    try {
      await navigator.clipboard.writeText(
        part.errorText ?? t("toolCalls.error"),
      );
      setCopiedError(true);
      setTimeout(() => setCopiedError(false), 2000);
    } catch (error) {
      console.error("[ToolCallCard] copy error failed:", error);
    }
  };

  return (
    <div
      className={`tool-call-card tool-call-card--${meta.tone} ${
        expanded ? "tool-call-card--expanded" : ""
      } ${isInProgress ? "tool-call-card--scanning" : ""}`.trim()}
    >
      <button type="button" className="tool-call-header" onClick={onToggle}>
        <div className="tool-call-title">{title}</div>
        <div className="tool-call-status">
          <span
            className={`tool-call-status-icon ${
              isInProgress ? "tool-call-status-icon--spinning" : ""
            }`.trim()}
            aria-hidden
          >
            <StatusIcon size={16} />
          </span>
          <span className="tool-call-status-label">{meta.label}</span>
          <svg
            className={`tool-call-chevron ${expanded ? "tool-call-chevron--open" : ""}`.trim()}
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
        </div>
      </button>
      <div className="tool-call-summary">{getToolSummary(part, t)}</div>
      {expanded ? (
        <div className="tool-call-body">
          {/* 错误信息区块 */}
          {part.state === "output-error" && (
            <div className="tool-call-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.35rem",
                }}
              >
                <div className="tool-call-section-title">
                  {t("toolCalls.error")}
                </div>
                <button
                  type="button"
                  onClick={handleCopyError}
                  className="tool-call-copy-icon-button"
                  title={
                    copiedError
                      ? t("messages.actions.copied")
                      : t("toolCalls.actions.copyOutput")
                  }
                >
                  {copiedError ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="tool-call-error-text">
                {part.errorText ?? t("toolCalls.error")}
              </div>
            </div>
          )}

          {/* 输入参数区块 */}
          {showInput && (
            <div className="tool-call-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.35rem",
                }}
              >
                <div className="tool-call-section-title">
                  {t("toolCalls.parameters")}
                </div>
                <button
                  type="button"
                  onClick={handleCopyInput}
                  className="tool-call-copy-icon-button"
                  title={
                    copiedInput
                      ? t("messages.actions.copied")
                      : t("toolCalls.actions.copyInput")
                  }
                >
                  {copiedInput ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="tool-call-json">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}

          {/* 输出结果区块 */}
          {showOutput && (
            <div className="tool-call-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.35rem",
                }}
              >
                <div className="tool-call-section-title">
                  {t("toolCalls.result")}
                </div>
                <button
                  type="button"
                  onClick={handleCopyOutput}
                  className="tool-call-copy-icon-button"
                  title={
                    copiedOutput
                      ? t("messages.actions.copied")
                      : t("toolCalls.actions.copyOutput")
                  }
                >
                  {copiedOutput ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="tool-call-json">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

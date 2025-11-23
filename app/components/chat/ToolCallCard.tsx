"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { type ToolMessagePart } from "./constants/toolConstants";
import {
  getToolTitle,
  getToolSummary,
  getToolStatusMeta,
} from "./utils/toolUtils";

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
  const title = getToolTitle(part.type);
  const meta = getToolStatusMeta(part.state);
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
      console.error("复制失败:", error);
    }
  };

  // 复制输出结果
  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(part.output, null, 2));
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  // 复制错误信息
  const handleCopyError = async () => {
    try {
      await navigator.clipboard.writeText(part.errorText ?? "未知错误");
      setCopiedError(true);
      setTimeout(() => setCopiedError(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
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
      <div className="tool-call-summary">{getToolSummary(part)}</div>
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
                <div className="tool-call-section-title">错误信息</div>
                <button
                  type="button"
                  onClick={handleCopyError}
                  className="tool-call-copy-icon-button"
                  title={copiedError ? "已复制" : "复制错误信息"}
                >
                  {copiedError ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="tool-call-error-text">
                {part.errorText ?? "未知错误"}
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
                <div className="tool-call-section-title">输入参数</div>
                <button
                  type="button"
                  onClick={handleCopyInput}
                  className="tool-call-copy-icon-button"
                  title={copiedInput ? "已复制" : "复制输入参数"}
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
                <div className="tool-call-section-title">执行结果</div>
                <button
                  type="button"
                  onClick={handleCopyOutput}
                  className="tool-call-copy-icon-button"
                  title={copiedOutput ? "已复制" : "复制执行结果"}
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

/**
 * 工具调用相关的工具函数
 */

import type { TFunction } from "i18next";
import {
  TOOL_LABEL_KEYS,
  TOOL_STATUS_META,
  type ToolMessagePart,
  type ToolStatusMeta,
  type ToolStatusMetaDefinition,
} from "../constants/toolConstants";

const getByteLength = (value: unknown): number => {
  if (value === undefined || value === null) return 0;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return new TextEncoder().encode(text).length;
};

/**
 * 获取工具调用标题
 */
export const getToolTitle = (type: string, t: TFunction): string => {
  const translationKey = TOOL_LABEL_KEYS[type];
  if (translationKey) {
    const translated = t(`toolCalls.tools.${translationKey}`);
    if (translated) return translated;
  }

  if (type.startsWith("tool-")) {
    const translated = t(`toolCalls.tools.${type}`, {
      defaultValue: "",
    });
    if (translated) return translated;
    return type.replace("tool-", "");
  }

  return type;
};

/**
 * 获取工具调用状态摘要
 */
export const getToolSummary = (part: ToolMessagePart, t: TFunction): string => {
  switch (part.state) {
    case "input-streaming":
    case "input-available": {
      const bytes = getByteLength(part.input ?? "");
      return t("toolCalls.summary.input", { bytes });
    }
    case "output-available": {
      const bytes = getByteLength(part.output ?? "");
      return t("toolCalls.summary.output", { bytes });
    }
    case "output-error":
      return t("toolCalls.summary.error", {
        message: part.errorText ?? t("toolCalls.error"),
      });
    default:
      return t("toolCalls.status.default");
  }
};

/**
 * 获取工具调用状态元数据
 */
export const getToolStatusMeta = (
  state: string,
  t: TFunction,
): ToolStatusMeta => {
  const meta: ToolStatusMetaDefinition =
    TOOL_STATUS_META[state] ?? TOOL_STATUS_META.default;
  return {
    label: t(`toolCalls.status.${meta.labelKey}`, {
      defaultValue: t("toolCalls.status.default"),
    }),
    Icon: meta.Icon,
    tone: meta.tone,
  };
};

/**
 * 生成工具调用卡片的展开键
 */
export const getToolExpansionKey = (
  messageId: string,
  index: number,
  toolCallId?: string,
  state?: string,
): string => {
  const baseKey = toolCallId ? String(toolCallId) : `${messageId}-${index}`;
  return state ? `${baseKey}-${state}` : baseKey;
};

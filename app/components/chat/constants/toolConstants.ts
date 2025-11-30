/**
 * 工具调用相关常量定义
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Wrench,
} from "lucide-react";

export const TOOL_LABEL_KEYS: Record<string, string> = {
  "tool-drawio_read": "tool-drawio_read",
  "tool-drawio_edit_batch": "tool-drawio_edit_batch",
  "tool-drawio_overwrite": "tool-drawio_overwrite",
};

export type ToolStatusMeta = {
  label: string;
  Icon: LucideIcon;
  tone: "pending" | "success" | "error" | "info";
};

export type ToolStatusMetaDefinition = {
  labelKey: string;
  Icon: LucideIcon;
  tone: ToolStatusMeta["tone"];
};

export const TOOL_STATUS_META: Record<string, ToolStatusMetaDefinition> = {
  "input-streaming": {
    labelKey: "input-streaming",
    Icon: Loader2,
    tone: "pending",
  },
  "input-available": {
    labelKey: "input-available",
    Icon: Wrench,
    tone: "pending",
  },
  "output-available": {
    labelKey: "output-available",
    Icon: CheckCircle2,
    tone: "success",
  },
  "output-error": {
    labelKey: "output-error",
    Icon: AlertTriangle,
    tone: "error",
  },
  call: { labelKey: "call", Icon: Wrench, tone: "pending" },
  result: { labelKey: "result", Icon: CheckCircle2, tone: "success" },
  default: { labelKey: "default", Icon: Info, tone: "pending" },
};

// 工具调用消息部分的类型定义
export interface ToolMessagePart {
  type: string;
  state: string;
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  [key: string]: unknown;
}

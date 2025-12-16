import type { AIToolName, ClientToolName, ToolName } from "./tool-names";
import { AI_TOOL_NAMES, CLIENT_TOOL_NAMES } from "./tool-names";

/**
 * 工具默认超时配置（毫秒）。
 *
 * - AI 工具（后端执行）：通常 30s 足以完成读取/批量编辑/覆盖。
 * - 前端执行工具（Socket.IO 转发到浏览器/Electron）：读取/写入设为 60s，
 *   多页导出可能更耗时，提升到 120s。
 */
export const TOOL_TIMEOUT_CONFIG = {
  [AI_TOOL_NAMES.DRAWIO_READ]: 30_000,
  [AI_TOOL_NAMES.DRAWIO_EDIT_BATCH]: 30_000,
  [AI_TOOL_NAMES.DRAWIO_OVERWRITE]: 30_000,
  [CLIENT_TOOL_NAMES.GET_DRAWIO_XML]: 60_000,
  [CLIENT_TOOL_NAMES.REPLACE_DRAWIO_XML]: 60_000,
  [CLIENT_TOOL_NAMES.EXPORT_DRAWIO]: 120_000,
} as const satisfies Record<ToolName, number>;

export type ToolTimeoutConfig = Record<ToolName, number>;
export type AIToolTimeoutConfig = Record<AIToolName, number>;
export type ClientToolTimeoutConfig = Record<ClientToolName, number>;

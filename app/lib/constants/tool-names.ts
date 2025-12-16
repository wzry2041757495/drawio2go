/**
 * 工具名称常量：
 * - AI 工具：直接暴露给 LLM 的后端执行工具。
 * - 前端执行工具：通过 Socket.IO 由浏览器/Electron 前端完成的工具。
 */
export const AI_TOOL_NAMES = {
  DRAWIO_READ: "drawio_read",
  DRAWIO_EDIT_BATCH: "drawio_edit_batch",
  DRAWIO_OVERWRITE: "drawio_overwrite",
} as const;

export const CLIENT_TOOL_NAMES = {
  GET_DRAWIO_XML: "get_drawio_xml",
  REPLACE_DRAWIO_XML: "replace_drawio_xml",
  EXPORT_DRAWIO: "export_drawio",
} as const;

export type AIToolName = (typeof AI_TOOL_NAMES)[keyof typeof AI_TOOL_NAMES];
export type ClientToolName =
  (typeof CLIENT_TOOL_NAMES)[keyof typeof CLIENT_TOOL_NAMES];
export type ToolName = AIToolName | ClientToolName;

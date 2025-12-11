/**
 * Socket.IO 通讯协议类型定义
 *
 * 定义后端和前端之间通过 Socket.IO 传递的消息格式
 */

import type { ClientToolName } from "@/lib/constants/tool-names";
import type { ToolCallRequest as BaseToolCallRequest } from "./socket";

/**
 * 后端 → 前端：工具调用请求
 */
export interface ToolCallRequest extends BaseToolCallRequest {
  toolName: ClientToolName;
  timeout: number;
  /**
   * AI 侧传入的操作描述，供自动版本创建时生成版本描述使用
   */
  description?: string;
}

/**
 * 前端 → 后端：工具执行结果
 */
export interface ToolCallResult {
  requestId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Socket.IO 服务器到客户端事件类型
 */
export interface ServerToClientEvents {
  "tool:execute": (request: ToolCallRequest) => void;
}

/**
 * Socket.IO 客户端到服务器事件类型
 */
export interface ClientToServerEvents {
  "tool:result": (result: ToolCallResult) => void;
  join_project: (projectUuid: string) => void;
  leave_project: (projectUuid: string) => void;
}

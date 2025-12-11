/**
 * 工具执行器
 *
 * 提供两种执行方式：
 * 1. executeToolOnClient - 通过 Socket.IO 在前端执行（用于 DrawIO 工具）
 * 2. executeToolOnServer - 直接在后端执行（预留接口，用于未来的后端工具）
 */

import { v4 as uuidv4 } from "uuid";
import type { ToolCallRequest } from "@/app/types/socket-protocol";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Tool Executor");

/**
 * 通过 Socket.IO 在客户端执行工具
 *
 * @param toolName - 工具名称
 * @param input - 工具输入参数
 * @param projectUuid - 所属项目 ID
 * @param conversationId - 当前会话 ID
 * @param timeout - 超时时间（毫秒），默认 30000ms (30秒)
 * @returns Promise<unknown> - 工具执行结果
 *
 * @throws Error - 当 Socket.IO 未初始化、连接断开或执行超时时抛出错误
 */
export async function executeToolOnClient(
  toolName: string,
  input: Record<string, unknown>,
  projectUuid: string,
  conversationId: string,
  timeout: number = 60000,
): Promise<unknown> {
  // 默认超时增加到 60 秒，以支持版本创建等耗时操作
  // 获取全局 Socket.IO 实例
  const io = global.io;
  const pendingRequests = global.pendingRequests;
  const emitToolExecute = global.emitToolExecute;

  if (!pendingRequests) {
    throw new Error("pendingRequests 未初始化");
  }

  if (!io) {
    throw new Error("Socket.IO 服务器未初始化");
  }

  const normalizedProjectUuid = projectUuid.trim();
  const normalizedConversationId = conversationId.trim();

  if (!normalizedProjectUuid || !normalizedConversationId) {
    throw new Error("缺少项目或会话上下文，无法执行工具");
  }

  // 检查是否有客户端连接
  const connectedClients = io.sockets.sockets.size;
  if (connectedClients === 0) {
    throw new Error("目标项目没有客户端在线");
  }

  const requestId = uuidv4();

  return new Promise((resolve, reject) => {
    // 设置超时
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`工具执行超时 (${timeout}ms)，前端未响应`));
    }, timeout);

    // 存储 Promise 回调
    pendingRequests.set(requestId, {
      resolve: (result: unknown) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      reject: (error: Error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });

    // 构造请求消息
    const request: ToolCallRequest = {
      requestId,
      toolName: toolName as ToolCallRequest["toolName"],
      input,
      timeout,
      projectUuid: normalizedProjectUuid,
      conversationId: normalizedConversationId,
    };

    // 按项目房间投递
    try {
      if (typeof emitToolExecute === "function") {
        emitToolExecute(request);
      } else {
        // 兜底：如果缺失全局封装，直接使用房间广播
        const roomSize = io.sockets.adapter.rooms.get(
          normalizedProjectUuid,
        )?.size;

        if (!roomSize || roomSize === 0) {
          pendingRequests.delete(requestId);
          clearTimeout(timeoutId);
          reject(new Error("目标项目没有客户端在线"));
          return;
        }

        io.to(normalizedProjectUuid).emit("tool:execute", request);
      }
    } catch (error) {
      pendingRequests.delete(requestId);
      clearTimeout(timeoutId);
      const message =
        error instanceof Error ? error.message : String(error ?? "未知错误");
      reject(new Error(message));
      return;
    }

    logger.info("已发送工具调用请求", {
      toolName,
      requestId,
      projectUuid: normalizedProjectUuid,
      conversationId: normalizedConversationId,
      connectedClients,
    });
  });
}

/**
 * 在服务器端执行工具（预留接口）
 *
 * @param toolName - 工具名称
 * @param input - 工具输入参数
 * @returns Promise<unknown> - 工具执行结果
 *
 * @throws Error - 当工具未实现时抛出错误
 */
export async function executeToolOnServer(
  toolName: string,
  _input: Record<string, unknown>,
): Promise<unknown> {
  // 未来在这里实现后端工具
  // 例如：文件读写、数据库操作等不需要浏览器环境的工具
  throw new Error(`服务器端工具 ${toolName} 尚未实现`);
}

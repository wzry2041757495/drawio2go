/**
 * Socket 相关的共享类型
 *
 * 为工具调用请求携带项目/会话上下文，便于前端按项目过滤。
 */
export interface ToolCallRequest {
  requestId: string;
  toolName: string;
  input: Record<string, unknown>;
  projectUuid: string;
  conversationId: string;
}

/**
 * 工具执行上下文（项目 + 对话）
 */
export interface ToolExecutionContext {
  projectUuid: string;
  conversationId: string;
}

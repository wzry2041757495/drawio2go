/**
 * 会话相关事件类型定义
 */
export type ConversationEventType =
  | "conversation-created"
  | "conversation-updated"
  | "conversation-deleted"
  | "messages-updated";

export interface ConversationEventDetail {
  projectUuid?: string;
  conversationId?: string;
  conversationIds?: string[];
  messageIds?: string[];
}

/**
 * 在浏览器环境派发会话相关的自定义事件
 * @param event 事件名称，限定为会话事件类型
 * @param detail 事件携带的上下文数据
 */
export function dispatchConversationEvent(
  event: ConversationEventType,
  detail: ConversationEventDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(event, { detail }));
}

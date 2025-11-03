/**
 * Chat 相关类型定义
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: unknown[];
  createdAt?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number; // 使用时间戳格式
}

export interface ChatSessionsData {
  sessions: Record<string, ChatSession>;
  sessionOrder: string[];
}
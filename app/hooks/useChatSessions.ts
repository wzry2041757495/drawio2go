"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { type UIMessage, type TextUIPart } from "ai";
import { ChatSession, ChatSessionsData, ChatExportData } from "@/app/types/chat";

const STORAGE_KEY = "chatSessions";

/**
 * 从消息生成会话标题
 * 取第一条用户消息的前30个字符作为标题
 */
function generateTitle(messages: UIMessage[]): string {
  if (messages.length === 0) return "新对话";

  // 查找第一条用户消息
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  if (!firstUserMessage) return "新对话";

  // 提取文本内容
  let text = "";
  if (Array.isArray(firstUserMessage.parts)) {
    const textPart = firstUserMessage.parts.find((part): part is TextUIPart => part.type === "text");
    text = textPart?.text || "";
  }

  // 截取前30个字符
  const title = text.trim().slice(0, 30);
  return title || "新对话";
}

/**
 * 创建默认会话数据
 */
function createDefaultSessionsData(): ChatSessionsData {
  const sessionId = uuidv4();
  const now = Date.now();

  const defaultSession: ChatSession = {
    id: sessionId,
    title: "新对话",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  return {
    sessions: { [sessionId]: defaultSession },
    activeSessionId: sessionId,
    sessionOrder: [sessionId],
  };
}

export function useChatSessions() {
  const [sessionsData, setSessionsData] = useState<ChatSessionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从 localStorage 加载
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ChatSessionsData = JSON.parse(saved);
        setSessionsData(parsed);
      } else {
        const defaultData = createDefaultSessionsData();
        setSessionsData(defaultData);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      }
    } catch (e) {
      console.error("加载聊天会话失败:", e);
      const defaultData = createDefaultSessionsData();
      setSessionsData(defaultData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 保存到 localStorage
  const persistData = useCallback((data: ChatSessionsData) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      setSessionsData(data);
    } catch (e) {
      console.error("保存聊天会话失败:", e);
      throw e;
    }
  }, []);

  // 创建新会话
  const createSession = useCallback(() => {
    if (!sessionsData) return null;

    const sessionId = uuidv4();
    const now = Date.now();

    const newSession: ChatSession = {
      id: sessionId,
      title: "新对话",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    const newData: ChatSessionsData = {
      sessions: {
        ...sessionsData.sessions,
        [sessionId]: newSession,
      },
      activeSessionId: sessionId,
      sessionOrder: [sessionId, ...sessionsData.sessionOrder],
    };

    persistData(newData);
    return sessionId;
  }, [sessionsData, persistData]);

  // 删除会话
  const deleteSession = useCallback((sessionId: string) => {
    if (!sessionsData) return;

    const { [sessionId]: _deleted, ...remainingSessions } = sessionsData.sessions;
    const newSessionOrder = sessionsData.sessionOrder.filter((id) => id !== sessionId);

    // 如果删除的是当前会话，切换到第一个剩余会话
    let newActiveSessionId = sessionsData.activeSessionId;
    if (sessionsData.activeSessionId === sessionId) {
      newActiveSessionId = newSessionOrder[0] || null;
    }

    // 如果没有剩余会话，创建一个新会话
    if (newSessionOrder.length === 0) {
      const newSessionId = uuidv4();
      const now = Date.now();
      const newSession: ChatSession = {
        id: newSessionId,
        title: "新对话",
        messages: [],
        createdAt: now,
        updatedAt: now,
      };

      const newData: ChatSessionsData = {
        sessions: { [newSessionId]: newSession },
        activeSessionId: newSessionId,
        sessionOrder: [newSessionId],
      };

      persistData(newData);
      return;
    }

    const newData: ChatSessionsData = {
      sessions: remainingSessions,
      activeSessionId: newActiveSessionId,
      sessionOrder: newSessionOrder,
    };

    persistData(newData);
  }, [sessionsData, persistData]);

  // 切换当前会话
  const switchSession = useCallback((sessionId: string) => {
    if (!sessionsData || !sessionsData.sessions[sessionId]) return;

    const newData: ChatSessionsData = {
      ...sessionsData,
      activeSessionId: sessionId,
    };

    persistData(newData);
  }, [sessionsData, persistData]);

  // 更新会话消息
  const updateSessionMessages = useCallback((sessionId: string, messages: UIMessage[]) => {
    if (!sessionsData || !sessionsData.sessions[sessionId]) return;

    const now = Date.now();
    const updatedSession: ChatSession = {
      ...sessionsData.sessions[sessionId],
      messages,
      title: generateTitle(messages),
      updatedAt: now,
    };

    const newData: ChatSessionsData = {
      ...sessionsData,
      sessions: {
        ...sessionsData.sessions,
        [sessionId]: updatedSession,
      },
    };

    persistData(newData);
  }, [sessionsData, persistData]);

  // 导出当前会话
  const exportSession = useCallback((sessionId: string) => {
    if (!sessionsData || !sessionsData.sessions[sessionId]) return null;

    const session = sessionsData.sessions[sessionId];
    const exportData: ChatExportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      sessions: [session],
    };

    return JSON.stringify(exportData, null, 2);
  }, [sessionsData]);

  // 导出所有会话
  const exportAllSessions = useCallback(() => {
    if (!sessionsData) return null;

    const allSessions = sessionsData.sessionOrder.map((id) => sessionsData.sessions[id]);
    const exportData: ChatExportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      sessions: allSessions,
    };

    return JSON.stringify(exportData, null, 2);
  }, [sessionsData]);

  // 导入会话（直接尝试导入，不做复杂验证）
  const importSessions = useCallback((jsonData: string) => {
    if (!sessionsData) return;

    try {
      const importData: ChatExportData = JSON.parse(jsonData);

      // 合并导入的会话到现有会话
      const newSessions = { ...sessionsData.sessions };
      const newSessionOrder = [...sessionsData.sessionOrder];

      for (const session of importData.sessions) {
        // 如果会话 ID 已存在，生成新 ID
        let sessionId = session.id;
        if (newSessions[sessionId]) {
          sessionId = uuidv4();
          session.id = sessionId;
        }

        newSessions[sessionId] = session;
        newSessionOrder.unshift(sessionId); // 添加到顶部
      }

      const newData: ChatSessionsData = {
        sessions: newSessions,
        activeSessionId: sessionsData.activeSessionId,
        sessionOrder: newSessionOrder,
      };

      persistData(newData);
      return true;
    } catch (e) {
      console.error("导入会话失败:", e);
      return false;
    }
  }, [sessionsData, persistData]);

  // 获取当前活动会话
  const activeSession = sessionsData?.activeSessionId
    ? sessionsData.sessions[sessionsData.activeSessionId]
    : null;

  return {
    sessionsData,
    activeSession,
    isLoading,
    createSession,
    deleteSession,
    switchSession,
    updateSessionMessages,
    exportSession,
    exportAllSessions,
    importSessions,
  };
}

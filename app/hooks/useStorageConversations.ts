"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getStorage, DEFAULT_PROJECT_UUID } from "@/app/lib/storage";
import type {
  Conversation,
  Message,
  CreateMessageInput,
} from "@/app/lib/storage";
import { runStorageTask, withTimeout } from "@/app/lib/utils";

const DEFAULT_STORAGE_TIMEOUT = 8000;
const DEFAULT_TIMEOUT_MESSAGE = "存储请求超时（8秒），请稍后重试";

const withStorageTimeout = <T>(
  promise: Promise<T>,
  message: string = DEFAULT_TIMEOUT_MESSAGE,
) => withTimeout(promise, DEFAULT_STORAGE_TIMEOUT, message);

/**
 * 对话管理 Hook
 *
 * 管理对话和消息的创建、读取、更新、删除
 */
export function useStorageConversations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const conversationsCacheRef = useRef<Map<string, Conversation[]>>(new Map());
  const conversationSubscribersRef = useRef<
    Map<string, Set<(conversations: Conversation[]) => void>>
  >(new Map());
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const messageSubscribersRef = useRef<
    Map<string, Set<(messages: Message[]) => void>>
  >(new Map());
  const resolveStorage = useCallback(
    async (): Promise<Awaited<ReturnType<typeof getStorage>>> =>
      withStorageTimeout(getStorage(), "获取存储实例超时（8秒），请稍后重试"),
    [],
  );

  const notifyConversationSubscribers = useCallback(
    (projectUuid: string, conversations: Conversation[]) => {
      const subscribers = conversationSubscribersRef.current.get(projectUuid);
      if (!subscribers) return;
      subscribers.forEach((callback) => {
        try {
          callback(conversations);
        } catch (callbackError) {
          console.warn(
            "[useStorageConversations] 订阅回调执行失败",
            callbackError,
          );
        }
      });
    },
    [],
  );

  const notifyMessageSubscribers = useCallback(
    (conversationId: string, messages: Message[]) => {
      const subscribers = messageSubscribersRef.current.get(conversationId);
      if (!subscribers) return;
      subscribers.forEach((callback) => {
        try {
          callback(messages);
        } catch (callbackError) {
          console.warn(
            "[useStorageConversations] 消息订阅回调执行失败",
            callbackError,
          );
        }
      });
    },
    [],
  );

  const loadConversationsForProject = useCallback(
    async (
      projectUuid: string,
      storage?: Awaited<ReturnType<typeof getStorage>>,
    ) => {
      const resolvedStorage = storage ?? (await resolveStorage());
      const conversations = await withStorageTimeout(
        resolvedStorage.getConversationsByProject(projectUuid),
        "加载会话列表超时（8秒），请重试",
      );
      conversationsCacheRef.current.set(projectUuid, conversations);
      notifyConversationSubscribers(projectUuid, conversations);
      return { storage: resolvedStorage, conversations };
    },
    [notifyConversationSubscribers, resolveStorage],
  );

  const loadMessagesForConversation = useCallback(
    async (
      conversationId: string,
      storage?: Awaited<ReturnType<typeof getStorage>>,
    ) => {
      const resolvedStorage = storage ?? (await resolveStorage());
      const messages = await withStorageTimeout(
        resolvedStorage.getMessagesByConversation(conversationId),
        "加载消息列表超时（8秒），请重试",
      );
      messagesCacheRef.current.set(conversationId, messages);
      notifyMessageSubscribers(conversationId, messages);
      return { storage: resolvedStorage, messages };
    },
    [notifyMessageSubscribers, resolveStorage],
  );

  const resolveProjectByConversationId = useCallback(
    (conversationId?: string | null) => {
      if (!conversationId) return undefined;
      for (const [
        projectUuid,
        conversations,
      ] of conversationsCacheRef.current) {
        if (conversations.some((conv) => conv.id === conversationId)) {
          return projectUuid;
        }
      }
      return undefined;
    },
    [],
  );

  const subscribeToConversations = useCallback(
    (
      projectUuid: string = DEFAULT_PROJECT_UUID,
      callback: (conversations: Conversation[]) => void,
      onError?: (error: Error) => void,
    ) => {
      const subscribers =
        conversationSubscribersRef.current.get(projectUuid) ?? new Set();
      subscribers.add(callback);
      conversationSubscribersRef.current.set(projectUuid, subscribers);

      let active = true;
      const cached = conversationsCacheRef.current.get(projectUuid);
      if (cached) {
        callback(cached);
      } else {
        loadConversationsForProject(projectUuid)
          .then(({ conversations }) => {
            if (active) callback(conversations);
          })
          .catch((subscribeError) => {
            console.error(
              "[useStorageConversations] 初始化对话订阅失败",
              subscribeError,
            );
            setError(subscribeError as Error);
            if (active && onError) onError(subscribeError as Error);
          });
      }

      return () => {
        active = false;
        const current = conversationSubscribersRef.current.get(projectUuid);
        if (!current) return;
        current.delete(callback);
        if (current.size === 0) {
          conversationSubscribersRef.current.delete(projectUuid);
        }
      };
    },
    [loadConversationsForProject],
  );

  const subscribeToMessages = useCallback(
    (
      conversationId: string | null,
      callback: (messages: Message[]) => void,
      onError?: (error: Error) => void,
    ) => {
      if (!conversationId) return () => undefined;

      const subscribers =
        messageSubscribersRef.current.get(conversationId) ?? new Set();
      subscribers.add(callback);
      messageSubscribersRef.current.set(conversationId, subscribers);

      let active = true;
      const cached = messagesCacheRef.current.get(conversationId);
      if (cached) {
        callback(cached);
      } else {
        loadMessagesForConversation(conversationId)
          .then(({ messages }) => {
            if (active) callback(messages);
          })
          .catch((subscribeError) => {
            console.error(
              "[useStorageConversations] 初始化消息订阅失败",
              subscribeError,
            );
            setError(subscribeError as Error);
            if (active && onError) onError(subscribeError as Error);
          });
      }

      return () => {
        active = false;
        const current = messageSubscribersRef.current.get(conversationId);
        if (!current) return;
        current.delete(callback);
        if (current.size === 0) {
          messageSubscribersRef.current.delete(conversationId);
        }
      };
    },
    [loadMessagesForConversation],
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleConversationEvent = (event: Event) => {
      const detail =
        (
          event as CustomEvent<{
            projectUuid?: string;
            conversationId?: string;
            conversationIds?: string[];
          }>
        ).detail ?? {};

      const targetProject =
        detail.projectUuid ??
        resolveProjectByConversationId(
          detail.conversationId || detail.conversationIds?.[0],
        );

      if (!targetProject) return;
      loadConversationsForProject(targetProject).catch((eventError) => {
        console.error("[useStorageConversations] 刷新对话缓存失败", eventError);
        setError(eventError as Error);
      });
    };

    const handleMessagesEvent = (event: Event) => {
      const detail =
        (
          event as CustomEvent<{
            projectUuid?: string;
            conversationId?: string;
            conversationIds?: string[];
          }>
        ).detail ?? {};

      const targetConversationIds =
        detail.conversationIds ??
        (detail.conversationId ? [detail.conversationId] : null) ??
        Array.from(messageSubscribersRef.current.keys());

      targetConversationIds.forEach((conversationId) => {
        loadMessagesForConversation(conversationId).catch((eventError) => {
          console.error(
            "[useStorageConversations] 刷新消息缓存失败",
            eventError,
          );
          setError(eventError as Error);
        });
      });
    };

    window.addEventListener("conversation-created", handleConversationEvent);
    window.addEventListener("conversation-updated", handleConversationEvent);
    window.addEventListener("conversation-deleted", handleConversationEvent);
    window.addEventListener("messages-updated", handleMessagesEvent);

    return () => {
      window.removeEventListener(
        "conversation-created",
        handleConversationEvent,
      );
      window.removeEventListener(
        "conversation-updated",
        handleConversationEvent,
      );
      window.removeEventListener(
        "conversation-deleted",
        handleConversationEvent,
      );
      window.removeEventListener("messages-updated", handleMessagesEvent);
    };
  }, [
    loadConversationsForProject,
    loadMessagesForConversation,
    resolveProjectByConversationId,
  ]);

  /**
   * 创建对话
   *
   * @param title 对话标题
   * @param projectUuid 工程 UUID（默认使用 DEFAULT_PROJECT_UUID）
   * @returns 创建的对话
   */
  const createConversation = useCallback(
    async (
      title: string = "New Chat",
      projectUuid: string = DEFAULT_PROJECT_UUID,
    ): Promise<Conversation> => {
      return runStorageTask(
        async () => {
          const storage = await resolveStorage();
          const conversation = await withStorageTimeout(
            storage.createConversation({
              id: uuidv4(),
              project_uuid: projectUuid,
              title,
            }),
            "创建会话超时（8秒），请重试",
          );
          return conversation;
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  /**
   * 获取对话
   */
  const getConversation = useCallback(
    async (id: string): Promise<Conversation | null> => {
      return runStorageTask(
        async () => {
          const storage = await resolveStorage();
          const conversation = await withStorageTimeout(
            storage.getConversation(id),
            "获取会话超时（8秒），请重试",
          );
          return conversation;
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  /**
   * 更新对话
   */
  const updateConversation = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Conversation, "title">>,
    ): Promise<void> => {
      await runStorageTask(
        async () => {
          const storage = await resolveStorage();
          await withStorageTimeout(
            storage.updateConversation(id, updates),
            "更新会话超时（8秒），请重试",
          );
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  /**
   * 删除对话
   */
  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      await runStorageTask(
        async () => {
          const storage = await resolveStorage();
          await withStorageTimeout(
            storage.deleteConversation(id),
            "删除会话超时（8秒），请重试",
          );
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  /**
   * 批量删除对话
   */
  const batchDeleteConversations = useCallback(
    async (ids: string[]): Promise<void> => {
      if (!ids || ids.length === 0) return;
      await runStorageTask(
        async () => {
          const storage = await resolveStorage();
          await withStorageTimeout(
            storage.batchDeleteConversations(ids),
            "批量删除会话超时（8秒），请重试",
          );
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  /**
   * 获取所有对话
   *
   * @param projectUuid 工程 UUID（默认使用 DEFAULT_PROJECT_UUID）
   */
  const getAllConversations = useCallback(
    async (
      projectUuid: string = DEFAULT_PROJECT_UUID,
    ): Promise<Conversation[]> => {
      return runStorageTask(
        async () => {
          const storage = await resolveStorage();
          const conversations = await withStorageTimeout(
            storage.getConversationsByProject(projectUuid),
            "加载会话列表超时（8秒），请重试",
          );
          return conversations;
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  /**
   * 获取对话的所有消息
   */
  const getMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      return runStorageTask(
        async () => {
          const storage = await resolveStorage();
          const messages = await withStorageTimeout(
            storage.getMessagesByConversation(conversationId),
            "加载消息列表超时（8秒），请重试",
          );
          return messages;
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  /**
   * 添加消息
   */
  const addMessage = useCallback(
    async (
      conversationId: string,
      role: "user" | "assistant" | "system",
      content: string,
      toolInvocations?: unknown,
      modelName?: string | null,
    ): Promise<Message> => {
      return runStorageTask(
        async () => {
          const storage = await resolveStorage();
          const message = await withStorageTimeout(
            storage.createMessage({
              id: uuidv4(),
              conversation_id: conversationId,
              role,
              content,
              tool_invocations: toolInvocations
                ? JSON.stringify(toolInvocations)
                : undefined,
              model_name: modelName ?? null,
            }),
            "创建消息超时（8秒），请重试",
          );

          return message;
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  /**
   * 批量添加消息
   */
  const addMessages = useCallback(
    async (messages: CreateMessageInput[]): Promise<Message[]> => {
      return runStorageTask(
        async () => {
          const storage = await resolveStorage();
          const created = await withStorageTimeout(
            storage.createMessages(messages),
            "批量创建消息超时（8秒），请重试",
          );
          return created;
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  /**
   * 导出对话为 JSON Blob
   */
  const exportConversations = useCallback(
    async (ids: string[]): Promise<Blob> => {
      return runStorageTask(
        async () => {
          const storage = await resolveStorage();
          const blob = await withStorageTimeout(
            storage.exportConversations(ids),
            "导出会话超时（8秒），请重试",
          );
          return blob;
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  return {
    loading,
    error,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    batchDeleteConversations,
    getAllConversations,
    getMessages,
    addMessage,
    addMessages,
    exportConversations,
    subscribeToConversations,
    subscribeToMessages,
  };
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getStorage, DEFAULT_PROJECT_UUID } from "@/app/lib/storage";
import type {
  Conversation,
  Message,
  CreateMessageInput,
} from "@/app/lib/storage";
import { runStorageTask } from "@/app/lib/utils";
import {
  getStorageTimeoutMessage,
  withStorageTimeout,
} from "@/app/lib/storage/timeout-utils";
import i18n from "@/app/i18n/client";
import { createLogger } from "@/lib/logger";

const logger = createLogger("useStorageConversations");
const ABNORMAL_STREAMING_TIMEOUT_MS = 2 * 60 * 1000;

const ERR_KEYS = {
  conversationLoadFailed: "errors:conversation.loadFailed",
  conversationCreateFailed: "errors:conversation.createFailed",
  conversationUpdateFailed: "errors:conversation.updateFailed",
  conversationDeleteFailed: "errors:conversation.deleteFailed",
  conversationMessageSaveFailed: "errors:conversation.messageSaveFailed",
  conversationExportFailed: "errors:conversation.exportFailed",
} as const;

const createConversationLoadFailedError = () =>
  new Error(i18n.t(ERR_KEYS.conversationLoadFailed));

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
      withStorageTimeout(getStorage(), getStorageTimeoutMessage()),
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
          logger.warn("conversation subscriber failed", {
            projectUuid,
            error: callbackError,
          });
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
          logger.warn("message subscriber failed", {
            conversationId,
            error: callbackError,
          });
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
        getStorageTimeoutMessage(),
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
        getStorageTimeoutMessage(),
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

  const evaluateStreamingStatus = useCallback(
    async (
      conversationId: string,
      storage?: Awaited<ReturnType<typeof getStorage>>,
    ): Promise<{
      conversation: Conversation | null;
      hasAbnormalExit: boolean;
      storage: Awaited<ReturnType<typeof getStorage>>;
    }> => {
      const resolvedStorage = storage ?? (await resolveStorage());
      const conversation = await withStorageTimeout(
        resolvedStorage.getConversation(conversationId),
        getStorageTimeoutMessage(),
      );

      let hasAbnormalExit = false;

      if (conversation?.is_streaming) {
        const since = conversation.streaming_since ?? 0;
        const elapsed = since > 0 ? Date.now() - since : Infinity;
        if (!since || elapsed > ABNORMAL_STREAMING_TIMEOUT_MS) {
          hasAbnormalExit = true;
          await withStorageTimeout(
            resolvedStorage.setConversationStreaming(conversationId, false),
            getStorageTimeoutMessage(),
          );
          conversation.is_streaming = false;
          conversation.streaming_since = null;
          conversation.updated_at = Date.now();
        }
      }

      return { conversation, hasAbnormalExit, storage: resolvedStorage };
    },
    [resolveStorage],
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
            logger.error("initialize conversation subscription failed", {
              projectUuid,
              error: subscribeError,
            });
            const localizedError = createConversationLoadFailedError();
            setError(localizedError);
            if (active && onError) onError(localizedError);
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
            logger.error("initialize message subscription failed", {
              conversationId,
              error: subscribeError,
            });
            const localizedError = createConversationLoadFailedError();
            setError(localizedError);
            if (active && onError) onError(localizedError);
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
        logger.error("refresh conversation cache failed", {
          projectUuid: targetProject,
          error: eventError,
        });
        const localizedError = createConversationLoadFailedError();
        setError(localizedError);
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

      for (const conversationId of targetConversationIds) {
        loadMessagesForConversation(conversationId).catch((eventError) => {
          logger.error("refresh message cache failed", {
            conversationId,
            error: eventError,
          });
          const localizedError = createConversationLoadFailedError();
          setError(localizedError);
        });
      }
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
          try {
            const storage = await resolveStorage();
            const conversation = await withStorageTimeout(
              storage.createConversation({
                id: uuidv4(),
                project_uuid: projectUuid,
                title,
                is_streaming: false,
                streaming_since: null,
              }),
              getStorageTimeoutMessage(),
            );
            return conversation;
          } catch (error) {
            logger.error("create conversation failed", {
              projectUuid,
              error,
            });
            throw new Error(i18n.t(ERR_KEYS.conversationCreateFailed));
          }
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
          try {
            const { conversation } = await evaluateStreamingStatus(id);
            return conversation;
          } catch (error) {
            logger.error("get conversation failed", { id, error });
            throw createConversationLoadFailedError();
          }
        },
        { setLoading, setError },
      );
    },
    [evaluateStreamingStatus],
  );

  const loadConversationWithStatus = useCallback(
    async (
      id: string,
    ): Promise<{
      conversation: Conversation | null;
      hasAbnormalExit: boolean;
    }> =>
      runStorageTask(
        async () => {
          try {
            const { conversation, hasAbnormalExit } =
              await evaluateStreamingStatus(id);
            return { conversation, hasAbnormalExit };
          } catch (error) {
            logger.error("load conversation with status failed", {
              id,
              error,
            });
            throw createConversationLoadFailedError();
          }
        },
        { setLoading, setError },
      ),
    [evaluateStreamingStatus],
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
          try {
            const storage = await resolveStorage();
            await withStorageTimeout(
              storage.updateConversation(id, updates),
              getStorageTimeoutMessage(),
            );
          } catch (error) {
            logger.error("update conversation failed", { id, error });
            throw new Error(i18n.t(ERR_KEYS.conversationUpdateFailed));
          }
        },
        { setLoading, setError },
      );
    },
    [resolveStorage],
  );

  const markConversationAsStreaming = useCallback(
    async (id: string): Promise<void> => {
      try {
        const storage = await resolveStorage();
        await withStorageTimeout(
          storage.setConversationStreaming(id, true),
          getStorageTimeoutMessage(),
        );
      } catch (error) {
        logger.error("mark conversation streaming failed", { id, error });
      }
    },
    [resolveStorage],
  );

  const markConversationAsCompleted = useCallback(
    async (id: string): Promise<void> => {
      try {
        const storage = await resolveStorage();
        await withStorageTimeout(
          storage.setConversationStreaming(id, false),
          getStorageTimeoutMessage(),
        );
      } catch (error) {
        logger.error("mark conversation completed failed", { id, error });
      }
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
          try {
            const storage = await resolveStorage();
            await withStorageTimeout(
              storage.deleteConversation(id),
              getStorageTimeoutMessage(),
            );
          } catch (error) {
            logger.error("delete conversation failed", { id, error });
            throw new Error(i18n.t(ERR_KEYS.conversationDeleteFailed));
          }
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
          try {
            const storage = await resolveStorage();
            await withStorageTimeout(
              storage.batchDeleteConversations(ids),
              getStorageTimeoutMessage(),
            );
          } catch (error) {
            logger.error("batch delete conversations failed", {
              ids,
              error,
            });
            throw new Error(i18n.t(ERR_KEYS.conversationDeleteFailed));
          }
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
          try {
            const storage = await resolveStorage();
            const conversations = await withStorageTimeout(
              storage.getConversationsByProject(projectUuid),
              getStorageTimeoutMessage(),
            );
            return conversations;
          } catch (error) {
            logger.error("load conversations failed", {
              projectUuid,
              error,
            });
            throw createConversationLoadFailedError();
          }
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
          try {
            const storage = await resolveStorage();
            const messages = await withStorageTimeout(
              storage.getMessagesByConversation(conversationId),
              getStorageTimeoutMessage(),
            );
            return messages;
          } catch (error) {
            logger.error("load messages failed", { conversationId, error });
            throw createConversationLoadFailedError();
          }
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
      parts: unknown[],
      modelName?: string | null,
      xmlVersionId?: string,
      createdAt?: number,
    ): Promise<Message> => {
      return runStorageTask(
        async () => {
          try {
            const storage = await resolveStorage();
            const message = await withStorageTimeout(
              storage.createMessage({
                id: uuidv4(),
                conversation_id: conversationId,
                role,
                parts_structure: JSON.stringify(parts ?? []),
                model_name: modelName ?? null,
                xml_version_id: xmlVersionId,
                created_at: createdAt,
              }),
              getStorageTimeoutMessage(),
            );

            return message;
          } catch (error) {
            logger.error("add message failed", {
              conversationId,
              error,
            });
            throw new Error(i18n.t(ERR_KEYS.conversationMessageSaveFailed));
          }
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
          try {
            const storage = await resolveStorage();
            const created = await withStorageTimeout(
              storage.createMessages(messages),
              getStorageTimeoutMessage(),
            );
            return created;
          } catch (error) {
            logger.error("add messages failed", {
              ids: messages.map((m) => m.conversation_id),
              error,
            });
            throw new Error(i18n.t(ERR_KEYS.conversationMessageSaveFailed));
          }
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
          try {
            const storage = await resolveStorage();
            const blob = await withStorageTimeout(
              storage.exportConversations(ids),
              getStorageTimeoutMessage(),
            );
            return blob;
          } catch (error) {
            logger.error("export conversations failed", { ids, error });
            throw new Error(i18n.t(ERR_KEYS.conversationExportFailed));
          }
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
    loadConversationWithStatus,
    markConversationAsStreaming,
    markConversationAsCompleted,
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

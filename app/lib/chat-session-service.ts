import { debounce, type DebouncedFunction } from "@/app/lib/utils";
import type {
  Conversation,
  CreateMessageInput,
  Message,
} from "@/app/lib/storage";
import type { ChatUIMessage, MessageMetadata } from "@/app/types/chat";

export type SubscribeToConversations = (
  projectUuid: string,
  callback: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void,
) => (() => void) | void;

export type SubscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void,
) => (() => void) | void;

export interface ChatSessionServiceDeps {
  getMessages: (conversationId: string) => Promise<Message[]>;
  addMessages: (messages: CreateMessageInput[]) => Promise<Message[]>;
  updateConversation: (
    id: string,
    updates: Partial<Pick<Conversation, "title">>,
  ) => Promise<void>;
  subscribeToConversations: SubscribeToConversations;
  subscribeToMessages: SubscribeToMessages;
}

export interface ChatSessionServiceOptions {
  defaultXmlVersionId?: string | null;
  debounceMs?: number;
  ensureMessageMetadata: (message: ChatUIMessage) => ChatUIMessage;
  onMessagesChange?: (
    conversationId: string,
    messages: ChatUIMessage[],
  ) => void;
  onSavingChange?: (saving: boolean) => void;
  onSaveError?: (error: string | null) => void;
}

export interface SaveOptions {
  forceTitleUpdate?: boolean;
  resolveConversationId?: (conversationId: string) => Promise<string>;
  onConversationResolved?: (resolvedId: string) => void;
}

export interface ChatSessionService {
  subscribeConversations: SubscribeToConversations;
  subscribeMessages: (
    conversationId: string,
    onError?: (error: Error) => void,
  ) => (() => void) | void;
  ensureMessages: (conversationId: string) => Promise<ChatUIMessage[]>;
  syncMessages: (
    conversationId: string,
    messages: ChatUIMessage[],
    options?: SaveOptions,
  ) => void;
  saveNow: (
    conversationId: string,
    messages: ChatUIMessage[],
    options?: SaveOptions,
  ) => Promise<void>;
  flushPending: (conversationId?: string | null) => void;
  handleConversationSwitch: (nextConversationId: string | null) => void;
  updateDefaultXmlVersionId: (versionId: string | null) => void;
  setEnsureMessageMetadata: (
    fn: (message: ChatUIMessage) => ChatUIMessage,
  ) => void;
  removeConversationCaches: (conversationIds: string[]) => void;
  getCachedMessages: (conversationId: string) => ChatUIMessage[] | undefined;
  dispose: () => void;
}

// ========== 消息转换与指纹 ========== //

/**
 * 将存储的 Message 转换为 UIMessage（用于 @ai-sdk/react）
 * AI SDK 5.0 使用 parts 数组结构
 */
export function convertMessageToUIMessage(msg: Message): ChatUIMessage {
  const parts: ChatUIMessage["parts"] = [];

  if (msg.content) {
    parts.push({
      type: "text",
      text: msg.content,
    });
  }

  if (msg.tool_invocations) {
    try {
      const toolInvocations = JSON.parse(msg.tool_invocations);
      if (Array.isArray(toolInvocations)) {
        for (const invocation of toolInvocations) {
          parts.push({
            type: "tool-invocation",
            toolInvocation: invocation,
          } as unknown as ChatUIMessage["parts"][number]);
        }
      }
    } catch (error) {
      console.error(
        "[chat-session-service] 解析 tool_invocations 失败:",
        error,
      );
    }
  }

  const metadata: MessageMetadata = {
    modelName: msg.model_name ?? null,
    createdAt: msg.created_at,
  };

  return {
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    parts,
    metadata,
  };
}

/**
 * 将 UIMessage 转换为 CreateMessageInput（用于存储）
 * 提取所有 text parts 合并为 content，保存 tool-invocation parts 为 tool_invocations
 */
export function convertUIMessageToCreateInput(
  uiMsg: ChatUIMessage,
  conversationId: string,
  xmlVersionId?: string,
): CreateMessageInput {
  const textParts = uiMsg.parts.filter((part) => part.type === "text");
  const content = textParts
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n");

  const toolParts = uiMsg.parts.filter(
    (part) => part.type === "tool-invocation",
  );
  const tool_invocations =
    toolParts.length > 0
      ? JSON.stringify(
          toolParts.map((part) =>
            "toolInvocation" in part ? part.toolInvocation : null,
          ),
        )
      : undefined;

  const metadata = (uiMsg.metadata as MessageMetadata | undefined) ?? {};
  const createdAt =
    typeof metadata.createdAt === "number" ? metadata.createdAt : undefined;

  return {
    id: uiMsg.id,
    conversation_id: conversationId,
    role: uiMsg.role as "user" | "assistant" | "system",
    content,
    tool_invocations,
    model_name: metadata.modelName ?? null,
    xml_version_id: xmlVersionId,
    created_at: createdAt,
  };
}

export function fingerprintMessage(message: ChatUIMessage): string {
  return JSON.stringify({
    id: message.id,
    role: message.role,
    parts: message.parts,
    metadata: message.metadata,
  });
}

export function getChangedMessages(
  previous: ChatUIMessage[] = [],
  next: ChatUIMessage[] = [],
): ChatUIMessage[] {
  const previousFingerprints = new Map(
    previous.map((msg) => [msg.id, fingerprintMessage(msg)]),
  );

  return next.filter((msg) => {
    const nextFingerprint = fingerprintMessage(msg);
    const prevFingerprint = previousFingerprints.get(msg.id);
    return !prevFingerprint || prevFingerprint !== nextFingerprint;
  });
}

export function generateTitle(messages: ChatUIMessage[]): string {
  if (messages.length === 0) return "新对话";

  const firstUserMessage = messages.find((msg) => msg.role === "user");
  if (!firstUserMessage) return "新对话";

  const textPart = firstUserMessage.parts.find((part) => part.type === "text");
  const text = textPart && "text" in textPart ? textPart.text : "";

  return text.trim().slice(0, 30) || "新对话";
}

// ========== 服务实现 ========== //

interface SavePayload extends SaveOptions {
  conversationId: string;
  messages: ChatUIMessage[];
}

export function createChatSessionService(
  deps: ChatSessionServiceDeps,
  options: ChatSessionServiceOptions,
): ChatSessionService {
  const {
    getMessages,
    addMessages,
    updateConversation,
    subscribeToConversations,
    subscribeToMessages,
  } = deps;

  const {
    onMessagesChange,
    onSavingChange,
    onSaveError,
    debounceMs = 1000,
  } = options;

  let ensureMessageMetadata = options.ensureMessageMetadata;
  let defaultXmlVersionId = options.defaultXmlVersionId ?? null;
  let previousConversationId: string | null = null;
  let pendingSavePayload: SavePayload | null = null;

  const conversationMessages = new Map<string, ChatUIMessage[]>();
  const lastSavedMessages = new Map<string, ChatUIMessage[]>();

  const notifyMessagesChange = (
    conversationId: string,
    messages: ChatUIMessage[],
  ) => {
    onMessagesChange?.(conversationId, messages);
  };

  const debouncedSave: DebouncedFunction<[SavePayload]> = debounce(
    (payload: SavePayload) => {
      pendingSavePayload = payload;
      void persistMessages(payload);
    },
    debounceMs,
  );

  const persistMessages = async (payload: SavePayload) => {
    if (!payload.conversationId) return;

    let conversationId = payload.conversationId;
    onSaveError?.(null);

    try {
      if (payload.resolveConversationId) {
        const resolvedId = await payload.resolveConversationId(conversationId);
        if (resolvedId && resolvedId !== conversationId) {
          conversationId = resolvedId;
          payload.onConversationResolved?.(resolvedId);

          const cached = conversationMessages.get(payload.conversationId);
          if (cached && !conversationMessages.has(resolvedId)) {
            conversationMessages.set(resolvedId, cached);
            conversationMessages.delete(payload.conversationId);
            notifyMessagesChange(resolvedId, cached);
          }

          const saved = lastSavedMessages.get(payload.conversationId);
          if (saved && !lastSavedMessages.has(resolvedId)) {
            lastSavedMessages.set(resolvedId, saved);
            lastSavedMessages.delete(payload.conversationId);
          }
        }
      }
    } catch (error) {
      onSaveError?.(
        error instanceof Error ? error.message : "保存前校验会话失败",
      );
      onSavingChange?.(false);
      return;
    }

    const normalizedMessages = payload.messages.map(ensureMessageMetadata);

    const previousMessages =
      lastSavedMessages.get(conversationId) ??
      conversationMessages.get(conversationId) ??
      [];

    const changedMessages = getChangedMessages(
      previousMessages,
      normalizedMessages,
    );

    if (changedMessages.length === 0) {
      const nextTitle = generateTitle(normalizedMessages);

      if (payload.forceTitleUpdate) {
        try {
          await updateConversation(conversationId, { title: nextTitle });
        } catch (error) {
          console.error("[chat-session-service] 强制更新对话标题失败:", error);
        }
      }

      if (!lastSavedMessages.has(conversationId)) {
        lastSavedMessages.set(conversationId, normalizedMessages);
      }

      onSavingChange?.(false);
      onSaveError?.(null);
      return;
    }

    const messagesToPersist = changedMessages.map((msg) =>
      convertUIMessageToCreateInput(
        msg,
        conversationId,
        defaultXmlVersionId ?? undefined,
      ),
    );

    onSavingChange?.(true);
    onSaveError?.(null);

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        await addMessages(messagesToPersist);

        const nextTitle = generateTitle(normalizedMessages);
        await updateConversation(conversationId, { title: nextTitle });

        conversationMessages.set(conversationId, normalizedMessages);
        lastSavedMessages.set(conversationId, normalizedMessages);
        notifyMessagesChange(conversationId, normalizedMessages);

        onSavingChange?.(false);
        onSaveError?.(null);
        pendingSavePayload = null;
        return;
      } catch (error) {
        console.error(
          `[chat-session-service] 保存消息失败（第 ${attempt} 次）:`,
          error,
        );

        if (attempt >= maxRetries) {
          const message =
            error instanceof Error ? error.message : "消息保存失败";
          onSavingChange?.(false);
          onSaveError?.(message);
          alert("消息自动保存失败，将在后台继续重试。请检查存储或网络状态。");
        } else {
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }
      }
    }
  };

  const ensureMessages = async (
    conversationId: string,
  ): Promise<ChatUIMessage[]> => {
    if (!conversationId) return [];

    const cached = conversationMessages.get(conversationId);
    if (cached) return cached;

    const storedMessages = await getMessages(conversationId);
    const normalized = storedMessages
      .map(convertMessageToUIMessage)
      .map(ensureMessageMetadata);

    conversationMessages.set(conversationId, normalized);
    lastSavedMessages.set(conversationId, normalized);
    notifyMessagesChange(conversationId, normalized);

    return normalized;
  };

  const handleSubscribedMessages = (
    conversationId: string,
    storedMessages: Message[],
  ) => {
    const normalized = storedMessages
      .map(convertMessageToUIMessage)
      .map(ensureMessageMetadata);
    conversationMessages.set(conversationId, normalized);
    lastSavedMessages.set(conversationId, normalized);
    notifyMessagesChange(conversationId, normalized);
  };

  const syncMessages = (
    conversationId: string,
    messages: ChatUIMessage[],
    options?: SaveOptions,
  ) => {
    if (!conversationId) return;
    const normalized = messages.map(ensureMessageMetadata);
    conversationMessages.set(conversationId, normalized);
    notifyMessagesChange(conversationId, normalized);

    const payload: SavePayload = {
      conversationId,
      messages: normalized,
      ...options,
    };

    pendingSavePayload = payload;
    debouncedSave(payload);
  };

  const saveNow = async (
    conversationId: string,
    messages: ChatUIMessage[],
    options?: SaveOptions,
  ) => {
    const payload: SavePayload = {
      conversationId,
      messages,
      ...options,
    };
    pendingSavePayload = payload;
    await persistMessages(payload);
  };

  const flushPending = (conversationId?: string | null) => {
    if (!pendingSavePayload) return;
    if (
      !conversationId ||
      pendingSavePayload.conversationId === conversationId
    ) {
      debouncedSave.flush();
      pendingSavePayload = null;
    }
  };

  const handleConversationSwitch = (nextConversationId: string | null) => {
    if (
      previousConversationId &&
      previousConversationId !== nextConversationId
    ) {
      flushPending(previousConversationId);
    }
    previousConversationId = nextConversationId;
  };

  const subscribeMessagesWithCache = (
    conversationId: string,
    onError?: (error: Error) => void,
  ) => {
    if (!conversationId) return () => undefined;
    return subscribeToMessages(
      conversationId,
      (storedMessages) =>
        handleSubscribedMessages(conversationId, storedMessages),
      onError,
    );
  };

  const removeConversationCaches = (conversationIds: string[]) => {
    conversationIds.forEach((id) => {
      conversationMessages.delete(id);
      lastSavedMessages.delete(id);
    });
  };

  const dispose = () => {
    if (pendingSavePayload) {
      debouncedSave.flush();
      pendingSavePayload = null;
    } else {
      debouncedSave.cancel();
    }
  };

  return {
    subscribeConversations: subscribeToConversations,
    subscribeMessages: subscribeMessagesWithCache,
    ensureMessages,
    syncMessages,
    saveNow,
    flushPending,
    handleConversationSwitch,
    updateDefaultXmlVersionId: (versionId: string | null) => {
      defaultXmlVersionId = versionId;
    },
    setEnsureMessageMetadata: (fn) => {
      ensureMessageMetadata = fn;
    },
    removeConversationCaches,
    getCachedMessages: (conversationId: string) =>
      conversationMessages.get(conversationId),
    dispose,
  };
}

"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ChatRunStateMachine } from "@/lib/chat-run-state-machine";
import type { DrainableToolQueue } from "@/lib/drainable-tool-queue";
import type { ChatUIMessage, RuntimeLLMConfig } from "@/app/types/chat";
import type { ChatSessionService } from "@/lib/chat-session-service";
import { convertUIMessageToCreateInput } from "@/lib/chat-session-service";
import {
  uploadImageAttachment,
  convertAttachmentItemToImagePart,
} from "@/lib/image-message-utils";
import type { AttachmentItem } from "@/hooks/useImageAttachments";
import { createLogger } from "@/lib/logger";
import { generateUUID } from "@/lib/utils";
import { getStorage } from "@/lib/storage";

const logger = createLogger("useChatLifecycle");

/**
 * 消息发送参数
 */
export interface SubmitMessageParams {
  /**
   * 用户输入文本（已 trim）
   */
  input: string;

  /**
   * 就绪的图片附件列表
   */
  readyAttachments: AttachmentItem[];

  /**
   * LLM 配置
   */
  llmConfig: RuntimeLLMConfig;

  /**
   * 解析后的项目 UUID
   */
  resolvedProjectUuid: string;

  /**
   * 目标会话 ID
   */
  targetSessionId: string;

  /**
   * 清除附件回调
   */
  clearAttachments?: () => void;

  /**
   * 设置输入文本回调
   */
  setInput?: (value: string) => void;
}

/**
 * useChatLifecycle Hook 参数
 */
export interface UseChatLifecycleOptions {
  /**
   * 聊天运行状态机引用
   */
  stateMachine: React.MutableRefObject<ChatRunStateMachine>;

  /**
   * 工具队列引用
   */
  toolQueue: React.MutableRefObject<DrainableToolQueue>;

  /**
   * 获取聊天锁
   * @returns true 表示成功获取锁，false 表示失败
   */
  acquireLock: () => boolean;

  /**
   * 释放聊天锁
   */
  releaseLock: () => void;

  /**
   * useChat 的 sendMessage 方法
   */
  sendMessage: (
    message: ChatUIMessage,
    options?: { body?: Record<string, unknown> },
  ) => Promise<void> | void;

  /**
   * useChat 的 stop 方法
   */
  stop: () => void;

  /**
   * 是否正在流式聊天
   */
  isChatStreaming: boolean;

  /**
   * 更新会话流式状态标记
   */
  updateStreamingFlag: (
    conversationId: string,
    isStreaming: boolean,
    options?: { syncOnly?: boolean },
  ) => Promise<void>;

  /**
   * 聊天会话服务实例
   */
  chatService: ChatSessionService;

  /**
   * 当前活动的会话 ID
   */
  activeConversationId: string | null;

  /**
   * setMessages 函数（用于错误回滚）
   */
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>;

  /**
   * 完成原因 ref（用于记录流式完成原因）
   */
  finishReasonRef: React.MutableRefObject<string | null>;

  /**
   * 错误提示回调
   */
  onError?: (message: string) => void;
}

/**
 * useChatLifecycle Hook 返回值
 */
export interface UseChatLifecycleResult {
  /**
   * 提交消息（简化版，接收已处理好的参数）
   *
   * @param params 消息提交参数
   *
   * @example
   * ```ts
   * await submitMessage({
   *   input: trimmedInput,
   *   readyAttachments: attachments,
   *   llmConfig: config,
   *   resolvedProjectUuid: projectId,
   *   targetSessionId: sessionId,
   *   clearAttachments: () => imageAttachments.clearAll(),
   *   setInput: (value) => setInput(value),
   * });
   * ```
   */
  submitMessage: (params: SubmitMessageParams) => Promise<void>;

  /**
   * 取消当前请求
   *
   * - 中止流式请求
   * - 等待工具队列清空
   * - 释放锁
   * - 更新流式状态
   * - 清理状态机上下文
   *
   * @example
   * ```ts
   * await handleCancel();
   * ```
   */
  handleCancel: () => Promise<void>;

  /**
   * 静默停止流式传输（不保存取消消息）
   *
   * 用于新建对话等场景
   *
   * @example
   * ```ts
   * await stopStreamingSilently();
   * ```
   */
  stopStreamingSilently: () => Promise<void>;

  /**
   * 获取当前运行上下文
   *
   * @returns 运行上下文，如果未初始化则返回 null
   *
   * @example
   * ```ts
   * const ctx = getRunContext();
   * if (ctx) {
   *   console.log('当前会话 ID:', ctx.conversationId);
   * }
   * ```
   */
  getRunContext: () => ReturnType<ChatRunStateMachine["getContext"]>;

  /**
   * 是否正在提交消息
   *
   * 用于禁用提交按钮
   */
  isSubmitting: boolean;
}

/**
 * 聊天生命周期管理 Hook
 *
 * 职责：
 * - 协调 ChatRunStateMachine 的状态转换
 * - 管理消息提交流程（锁获取、状态机初始化、发送消息、错误回滚）
 * - 管理取消流程（中止请求、等待工具队列、释放锁）
 * - 管理页面卸载处理（beforeunload/pagehide 监听）
 * - 管理组件卸载清理
 *
 * 设计说明：
 * - 完全使用 ChatRunStateMachine 的 transition() 方法进行状态转换
 * - 提供清晰的 API 供 ChatSidebar 使用
 * - 处理所有生命周期相关的边界情况和清理逻辑
 *
 * 状态转换流程：
 * - 提交：idle → preparing → streaming → tools-pending → finalizing → idle
 * - 取消：streaming/tools-pending → cancelled → idle
 * - 错误：* → errored → idle
 *
 * @example
 * ```tsx
 * const {
 *   submitMessage,
 *   handleCancel,
 *   stopStreamingSilently,
 *   getRunContext,
 *   isSubmitting,
 * } = useChatLifecycle({
 *   stateMachine,
 *   toolQueue,
 *   acquireLock,
 *   releaseLock,
 *   sendMessage,
 *   stop,
 *   isChatStreaming,
 *   updateStreamingFlag,
 *   chatService,
 *   activeConversationId,
 *   setMessages,
 *   finishReasonRef,
 *   onError: (message) => pushErrorToast(message),
 * });
 * ```
 */
export function useChatLifecycle(
  options: UseChatLifecycleOptions,
): UseChatLifecycleResult {
  const {
    stateMachine,
    toolQueue,
    acquireLock,
    releaseLock,
    sendMessage,
    stop,
    isChatStreaming,
    updateStreamingFlag,
    chatService,
    activeConversationId,
    setMessages,
    finishReasonRef,
    onError,
  } = options;

  // 页面卸载标记（防止重复处理）
  const pageUnloadHandledRef = useRef(false);

  // ========== 核心方法 ========== //

  /**
   * 准备用户消息
   */
  const prepareUserMessage = useCallback(
    async (
      input: string,
      readyAttachments: AttachmentItem[],
      llmConfig: RuntimeLLMConfig,
    ): Promise<ChatUIMessage> => {
      const messageId = generateUUID("msg");
      const createdAt = Date.now();
      finishReasonRef.current = null;

      const hasReadyAttachments = readyAttachments.length > 0;

      const imageParts = hasReadyAttachments
        ? await Promise.all(
            readyAttachments.map((item) =>
              convertAttachmentItemToImagePart(item, item.id),
            ),
          )
        : [];

      const parts: ChatUIMessage["parts"] = [
        ...(input
          ? [
              {
                type: "text",
                text: input,
              } as const,
            ]
          : []),
        ...imageParts,
      ];

      return {
        id: messageId,
        role: "user",
        parts,
        metadata: {
          createdAt,
          modelName: llmConfig.modelName,
        },
      };
    },
    [finishReasonRef],
  );

  /**
   * 保存用户消息和附件
   */
  const saveUserMessage = useCallback(
    async (
      userMessage: ChatUIMessage,
      targetSessionId: string,
      readyAttachments: AttachmentItem[],
    ): Promise<Awaited<ReturnType<typeof getStorage>>> => {
      const storage = await getStorage();

      // 保存消息
      await storage.createMessage(
        convertUIMessageToCreateInput(userMessage, targetSessionId),
      );

      // 上传附件
      if (readyAttachments.length > 0) {
        await Promise.all(
          readyAttachments.map((item) =>
            uploadImageAttachment({
              storage,
              attachmentId: item.id,
              conversationId: targetSessionId,
              messageId: userMessage.id,
              file: item.file,
              width: item.width,
              height: item.height,
            }),
          ),
        );
      }

      return storage;
    },
    [],
  );

  /**
   * 提交消息
   */
  const submitMessage = useCallback(
    async (params: SubmitMessageParams) => {
      const {
        input,
        readyAttachments,
        llmConfig,
        resolvedProjectUuid,
        targetSessionId,
        clearAttachments,
        setInput,
      } = params;

      const hasReadyAttachments = readyAttachments.length > 0;

      // 1. 状态机转换：idle → preparing
      try {
        stateMachine.current.transition("submit");
      } catch (error) {
        logger.error("[submitMessage] 状态转换失败（submit）", { error });
        onError?.("状态机状态异常，无法提交消息");
        return;
      }

      // 2. 获取锁
      const locked = acquireLock();
      if (!locked) {
        logger.warn("[submitMessage] 获取锁失败");
        stateMachine.current.transition("lock-failed");
        onError?.("无法获取聊天锁，请稍后重试");
        return;
      }

      // 3. 初始化状态机上下文
      stateMachine.current.initContext(targetSessionId);
      const ctx = stateMachine.current.getContext()!;
      ctx.lockAcquired = true;

      logger.debug("[submitMessage] 开始发送消息到会话:", targetSessionId);

      // 4. 准备用户消息
      const userMessage = await prepareUserMessage(
        input,
        readyAttachments,
        llmConfig,
      );

      // 清空输入框
      if (setInput) {
        setInput("");
      }

      let lockTransferredToStream = false;
      let storageForRollback: Awaited<ReturnType<typeof getStorage>> | null =
        null;

      try {
        // 5. 保存用户消息和附件到存储
        storageForRollback = await saveUserMessage(
          userMessage,
          targetSessionId,
          readyAttachments,
        );

        // 6. 状态机转换：preparing → streaming
        stateMachine.current.transition("lock-acquired");

        // 7. 发送消息到 LLM
        await sendMessage(userMessage, {
          body: {
            config: llmConfig,
            projectUuid: resolvedProjectUuid,
            conversationId: targetSessionId,
          },
        });

        lockTransferredToStream = true;

        // 8. 清理附件
        if (hasReadyAttachments && clearAttachments) {
          clearAttachments();
        }

        // 9. 标记流式状态
        void updateStreamingFlag(targetSessionId, true);

        logger.info("[submitMessage] 消息发送成功", { targetSessionId });
      } catch (error) {
        logger.error("[submitMessage] 发送消息失败:", error);

        // 错误处理：状态机转换到 errored
        try {
          stateMachine.current.transition("error");
        } catch (transitionError) {
          logger.error("[submitMessage] 状态转换失败（error）", {
            transitionError,
          });
        }

        // 回滚：删除已保存的用户消息
        if (storageForRollback) {
          try {
            await storageForRollback.deleteMessage(userMessage.id);
          } catch (deleteError) {
            logger.warn("[submitMessage] 回滚失败：删除消息失败", {
              messageId: userMessage.id,
              error: deleteError,
            });
          }
        }

        // 从 UI 移除消息
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));

        // 恢复输入框
        if (setInput) {
          setInput(input);
        }

        // 通知错误
        onError?.(
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "发送消息失败",
        );
      } finally {
        if (!lockTransferredToStream) {
          // 如果锁没有转移到流式响应，清理状态机并释放锁
          const ctx = stateMachine.current.getContext();
          if (ctx) {
            void updateStreamingFlag(ctx.conversationId, false);

            // 状态机转换：errored → idle
            try {
              stateMachine.current.transition("error-cleanup");
            } catch (transitionError) {
              logger.error("[submitMessage] 状态转换失败（error-cleanup）", {
                transitionError,
              });
            }

            stateMachine.current.clearContext();
          }
          releaseLock();
        }
      }
    },
    [
      stateMachine,
      acquireLock,
      releaseLock,
      prepareUserMessage,
      saveUserMessage,
      sendMessage,
      updateStreamingFlag,
      setMessages,
      onError,
    ],
  );

  /**
   * 取消当前请求
   */
  const handleCancel = useCallback(async () => {
    if (!isChatStreaming) {
      logger.debug("[handleCancel] 当前没有流式请求，忽略");
      return;
    }

    // 1. 使用状态机获取上下文
    const ctx = stateMachine.current.getContext();
    if (!ctx) {
      logger.warn("[handleCancel] 没有状态机上下文");
      return;
    }

    logger.info("[handleCancel] 用户取消聊天", {
      conversationId: ctx.conversationId,
    });

    // 2. 状态机转换：streaming/tools-pending → cancelled
    try {
      stateMachine.current.transition("cancel");
    } catch (error) {
      logger.error("[handleCancel] 状态转换失败（cancel）", { error });
    }

    // 3. 中止请求
    stop();

    // 4. 等待工具队列清空（确保工具不会继续执行）
    try {
      logger.info("[handleCancel] 等待工具队列清空");
      await toolQueue.current.drain();
      logger.info("[handleCancel] 工具队列已清空");
    } catch (error) {
      logger.warn("[handleCancel] 工具队列清空失败", { error });
    }

    // 5. 释放锁
    if (ctx.lockAcquired) {
      releaseLock();
    }

    // 6. 更新流式状态
    try {
      await updateStreamingFlag(ctx.conversationId, false);
    } catch (error) {
      logger.error("[handleCancel] 更新流式状态失败", { error });
    }

    // 7. 状态机转换：cancelled → idle
    try {
      stateMachine.current.transition("cancel-complete");
    } catch (error) {
      logger.error("[handleCancel] 状态转换失败（cancel-complete）", {
        error,
      });
    }

    // 8. 清理上下文
    stateMachine.current.clearContext();
    logger.info("[handleCancel] 聊天已取消");
  }, [
    isChatStreaming,
    stateMachine,
    stop,
    toolQueue,
    releaseLock,
    updateStreamingFlag,
  ]);

  /**
   * 静默停止流式传输（不保存取消消息）
   */
  const stopStreamingSilently = useCallback(async () => {
    if (!isChatStreaming) {
      logger.debug("[stopStreamingSilently] 当前没有流式请求，忽略");
      return;
    }

    logger.info("[stopStreamingSilently] 静默停止流式传输");

    // 使用状态机获取上下文
    const ctx = stateMachine.current.getContext();
    const targetConversationId = activeConversationId ?? ctx?.conversationId;

    // 中止请求
    stop();

    // 更新流式状态
    if (targetConversationId) {
      void updateStreamingFlag(targetConversationId, false);
    }

    // 清理状态机上下文
    if (ctx) {
      // 状态机转换：* → cancelled → idle
      try {
        if (stateMachine.current.canTransition("cancel")) {
          stateMachine.current.transition("cancel");
          stateMachine.current.transition("cancel-complete");
        }
      } catch (error) {
        logger.error("[stopStreamingSilently] 状态转换失败", { error });
      }

      stateMachine.current.clearContext();
    }

    // 释放锁
    releaseLock();
  }, [
    isChatStreaming,
    stateMachine,
    activeConversationId,
    stop,
    updateStreamingFlag,
    releaseLock,
  ]);

  /**
   * 获取当前运行上下文
   */
  const getRunContext = useCallback(() => {
    return stateMachine.current.getContext();
  }, [stateMachine]);

  // ========== 生命周期管理 ========== //

  /**
   * 页面卸载处理
   */
  useEffect(() => {
    pageUnloadHandledRef.current = false;

    const handlePageUnload = (
      _event: BeforeUnloadEvent | PageTransitionEvent,
    ) => {
      if (pageUnloadHandledRef.current) return;
      pageUnloadHandledRef.current = true;

      // 使用状态机获取上下文
      const ctx = stateMachine.current.getContext();
      if (!ctx) {
        // 没有正在进行的流式请求，只需要释放锁
        releaseLock();
        return;
      }

      logger.warn("[useChatLifecycle] 页面即将卸载，停止聊天请求", {
        conversationId: ctx.conversationId,
      });

      // 1) 立即中断正在进行的流式请求
      stop();

      // 2) 释放聊天锁，避免遗留占用
      releaseLock();

      const targetConversationId = activeConversationId ?? ctx.conversationId;

      // 3) 同步标记流式结束，避免卸载时遗留 streaming 状态
      updateStreamingFlag(targetConversationId, false, { syncOnly: true });
      void updateStreamingFlag(targetConversationId, false);

      // 4) 刷新待保存队列，确保 debounce 队列立即写入
      chatService.flushPending(targetConversationId);

      // 5) 清理状态机上下文
      stateMachine.current.clearContext();
    };

    window.addEventListener("beforeunload", handlePageUnload);
    window.addEventListener("pagehide", handlePageUnload);

    return () => {
      window.removeEventListener("beforeunload", handlePageUnload);
      window.removeEventListener("pagehide", handlePageUnload);
      pageUnloadHandledRef.current = false;
    };
  }, [
    activeConversationId,
    chatService,
    releaseLock,
    stop,
    updateStreamingFlag,
    stateMachine,
  ]);

  /**
   * 组件卸载清理
   */
  useEffect(
    () => () => {
      // 组件卸载时清理状态机和释放锁
      const ctx = stateMachine.current.getContext();
      if (ctx) {
        stateMachine.current.clearContext();
        releaseLock();
      }
    },
    [releaseLock, stateMachine],
  );

  // ========== 返回值 ========== //

  return {
    submitMessage,
    handleCancel,
    stopStreamingSilently,
    getRunContext,
    isSubmitting: isChatStreaming,
  };
}

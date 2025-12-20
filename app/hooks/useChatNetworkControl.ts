"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createLogger } from "@/lib/logger";
import type { ChatRunStateMachine } from "@/lib/chat-run-state-machine";
import type { DrainableToolQueue } from "@/lib/drainable-tool-queue";

const logger = createLogger("useChatNetworkControl");

/**
 * useChatNetworkControl Hook 参数
 */
export interface UseChatNetworkControlOptions {
  /**
   * 网络在线状态
   * - 来自 useNetworkStatus
   */
  isOnline: boolean;

  /**
   * 离线原因标签（用于显示）
   * - 例如："浏览器离线"、"服务器无响应"
   */
  offlineReasonLabel?: string;

  /**
   * 是否正在流式聊天
   * - 用于判断是否需要停止流式请求
   */
  isChatStreaming: boolean;

  /**
   * 当前活动的会话 ID
   * - 用于标记会话完成状态
   */
  activeConversationId: string | null;

  /**
   * 聊天运行状态机
   * - 用于获取上下文并进行状态转换
   */
  stateMachine: ChatRunStateMachine;

  /**
   * 聊天锁释放函数
   * - 网络断开时释放锁
   */
  releaseLock: () => void;

  /**
   * 停止流式响应函数
   * - 来自 useChat 的 stop 方法
   */
  stop: () => void;

  /**
   * 更新会话流式状态标记
   * - 用于更新存储中的 is_streaming 字段
   */
  updateStreamingFlag: (
    conversationId: string,
    isStreaming: boolean,
  ) => Promise<void>;

  /**
   * 标记会话为已完成
   * - 用于清理异常退出的会话
   */
  markConversationAsCompleted: (conversationId: string) => Promise<void>;

  /**
   * 会话 ID 解析函数
   * - 将 temp-xxx 转换为真实 ID
   */
  resolveConversationId: (conversationId: string) => Promise<string>;

  /**
   * 打开 Alert 对话框
   * - 用于显示网络断开/恢复提示
   */
  openAlertDialog: (config: {
    status: "danger" | "warning" | "info";
    title: string;
    description: string;
    isDismissable: boolean;
  }) => void;

  /**
   * 国际化翻译函数
   */
  t: (key: string, fallback?: string) => string;

  /**
   * 工具队列（可选）
   * - 网络断开时可能需要清空工具队列
   */
  toolQueue?: DrainableToolQueue;
}

/**
 * useChatNetworkControl Hook 返回值
 */
export interface UseChatNetworkControlResult {
  /**
   * 是否显示网络恢复提示
   * - 用于在网络恢复后短暂显示提示信息
   */
  showOnlineRecoveryHint: boolean;

  /**
   * 关闭网络恢复提示
   */
  dismissRecoveryHint: () => void;

  /**
   * 手动触发网络断开处理
   * - 用于测试或外部调用
   */
  handleNetworkDisconnect: () => void;
}

/**
 * 网络恢复提示显示时长（毫秒）
 */
const RECOVERY_HINT_DURATION = 4800;

/**
 * 聊天网络控制 Hook
 *
 * 职责：
 * - 监听网络状态变化（isOnline）
 * - 网络断开时：停止流式、释放锁、标记对话完成
 * - 网络恢复时：显示恢复提示
 * - 管理 showOnlineRecoveryHint 状态
 * - 与 ChatRunStateMachine 状态机协调
 *
 * 设计说明：
 * - 从 ChatSidebar 提取网络状态处理逻辑
 * - 使用状态机进行状态转换而非直接操作 ref
 * - 提供清晰的 API 供外部调用
 * - 自动管理网络恢复提示的显示和隐藏
 *
 * @example
 * ```tsx
 * const {
 *   showOnlineRecoveryHint,
 *   dismissRecoveryHint,
 *   handleNetworkDisconnect,
 * } = useChatNetworkControl({
 *   isOnline,
 *   offlineReasonLabel,
 *   isChatStreaming,
 *   activeConversationId,
 *   stateMachine,
 *   releaseLock,
 *   stop,
 *   updateStreamingFlag,
 *   markConversationAsCompleted,
 *   resolveConversationId,
 *   openAlertDialog,
 *   t,
 *   toolQueue,
 * });
 * ```
 */
export function useChatNetworkControl(
  options: UseChatNetworkControlOptions,
): UseChatNetworkControlResult {
  const {
    isOnline,
    offlineReasonLabel,
    isChatStreaming,
    activeConversationId,
    stateMachine,
    releaseLock,
    stop,
    updateStreamingFlag,
    markConversationAsCompleted,
    resolveConversationId,
    openAlertDialog,
    t,
    toolQueue,
  } = options;

  // ========== 状态 ========== //

  /**
   * 是否显示网络恢复提示
   */
  const [showOnlineRecoveryHint, setShowOnlineRecoveryHint] = useState(false);

  // ========== 引用 ========== //

  /**
   * 上一次的在线状态
   * - 用于检测状态变化
   */
  const previousOnlineStatusRef = useRef(isOnline);

  /**
   * 是否曾经离线过
   * - 用于判断是否需要显示恢复提示
   */
  const wasOfflineRef = useRef(false);

  // ========== 核心方法 ========== //

  /**
   * 处理网络断开
   * - 停止流式响应
   * - 释放聊天锁
   * - 标记会话完成
   * - 显示断开提示
   */
  const handleNetworkDisconnect = useCallback(() => {
    setShowOnlineRecoveryHint(false);

    if (isChatStreaming) {
      logger.warn("[useChatNetworkControl] 网络断开，停止聊天请求");
    } else {
      logger.warn(
        "[useChatNetworkControl] 网络断开，当前无流式请求，释放聊天锁",
      );
    }

    // 使用状态机获取上下文
    const ctx = stateMachine.getContext();
    const targetConversationId = activeConversationId ?? ctx?.conversationId;

    // 停止流式响应
    stop();

    // 释放聊天锁
    releaseLock();

    // 清空工具队列（如果存在）
    if (toolQueue) {
      try {
        // DrainableToolQueue 没有直接的 clear 方法，
        // 但我们可以通过设置一个很短的超时来快速失败
        // 这里我们不调用 drain，因为网络断开时不需要等待工具完成
        logger.info("[useChatNetworkControl] 网络断开，工具队列将被忽略");
      } catch (error) {
        logger.error("[useChatNetworkControl] 清空工具队列失败", { error });
      }
    }

    // 更新会话流式状态
    if (targetConversationId) {
      updateStreamingFlag(targetConversationId, false).catch((error) => {
        logger.error("[useChatNetworkControl] 网络断开后更新流式状态失败", {
          conversationId: targetConversationId,
          error,
        });
      });

      resolveConversationId(targetConversationId)
        .then((resolvedId) => markConversationAsCompleted(resolvedId))
        .catch((error) => {
          logger.error("[useChatNetworkControl] 网络断开后标记对话完成失败", {
            error,
            conversationId: targetConversationId,
          });
        });
    }

    // 显示断开提示
    openAlertDialog({
      status: "danger",
      title: t("chat:status.networkOffline"),
      description: offlineReasonLabel
        ? `${t("chat:status.networkOfflineDesc")}（${offlineReasonLabel}）`
        : t("chat:status.networkOfflineDesc"),
      isDismissable: true,
    });

    wasOfflineRef.current = true;
  }, [
    activeConversationId,
    isChatStreaming,
    markConversationAsCompleted,
    offlineReasonLabel,
    openAlertDialog,
    releaseLock,
    resolveConversationId,
    stateMachine,
    stop,
    t,
    toolQueue,
    updateStreamingFlag,
  ]);

  /**
   * 处理网络恢复
   * - 显示恢复提示
   * - 设置自动隐藏定时器
   */
  const handleNetworkReconnect = useCallback(() => {
    wasOfflineRef.current = false;
    setShowOnlineRecoveryHint(true);
    logger.info("[useChatNetworkControl] 网络恢复，允许继续聊天");

    openAlertDialog({
      status: "warning",
      title: t("chat:status.networkOnline"),
      description: t("chat:status.networkOnlineDesc"),
      isDismissable: true,
    });
  }, [openAlertDialog, t]);

  /**
   * 关闭网络恢复提示
   */
  const dismissRecoveryHint = useCallback(() => {
    setShowOnlineRecoveryHint(false);
  }, []);

  // ========== 副作用 ========== //

  /**
   * 监听网络状态变化
   * - 检测在线 → 离线 或 离线 → 在线 的变化
   * - 触发相应的处理逻辑
   */
  useEffect(() => {
    const previousOnline = previousOnlineStatusRef.current;
    const onlineStatusChanged = previousOnline !== isOnline;
    previousOnlineStatusRef.current = isOnline;

    if (!onlineStatusChanged) return;

    if (!isOnline) {
      // 网络断开
      handleNetworkDisconnect();
      return;
    }

    // 网络恢复
    if (wasOfflineRef.current) {
      handleNetworkReconnect();
    }
  }, [
    isOnline,
    handleNetworkDisconnect,
    handleNetworkReconnect,
    // 注意：这里不需要添加所有依赖，因为 handleNetworkDisconnect 和 handleNetworkReconnect 已经是稳定的
  ]);

  /**
   * 自动隐藏网络恢复提示
   * - 在 RECOVERY_HINT_DURATION 毫秒后自动隐藏
   */
  useEffect(() => {
    if (!showOnlineRecoveryHint) return;

    const timer = window.setTimeout(() => {
      setShowOnlineRecoveryHint(false);
    }, RECOVERY_HINT_DURATION);

    return () => window.clearTimeout(timer);
  }, [showOnlineRecoveryHint]);

  // ========== 返回值 ========== //

  return {
    showOnlineRecoveryHint,
    dismissRecoveryHint,
    handleNetworkDisconnect,
  };
}

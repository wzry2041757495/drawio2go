"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { useToast } from "@/app/components/toast";
import { useAppTranslation } from "@/app/i18n/hooks";
import { createLogger } from "@/lib/logger";

const logger = createLogger("GlobalBackendCleanupNotifier");

interface BackendCleanupStatus {
  status: "started" | "completed" | "failed";
}

/**
 * 全局后端清理通知组件（无 UI）
 *
 * - 监听主进程广播的 `backend:cleanup` 事件
 * - 应用退出时显示"正在清理后端连接"Toast 提示
 * - 复用与 GlobalUpdateChecker 相同的订阅机制
 */
export default function GlobalBackendCleanupNotifier() {
  const { t } = useAppTranslation("common");
  const { push, dismiss } = useToast();

  const toastIdRef = useRef<string | null>(null);

  const canSubscribe = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.electron?.onBackendCleanup === "function",
    [],
  );

  const handleCleanupStatus = useCallback(
    (data: BackendCleanupStatus) => {
      logger.info(`[Cleanup] Status: ${data.status}`);

      switch (data.status) {
        case "started":
          // 清除之前的 Toast（如果有）
          if (toastIdRef.current) {
            dismiss(toastIdRef.current);
          }
          // 显示持续性 Toast
          toastIdRef.current = push({
            variant: "info",
            description: t("backend.cleanup.started", {
              defaultValue: "正在清理后端连接...",
            }),
            duration: Infinity, // 持续显示直到应用退出
          });
          break;

        case "completed":
          // 应用即将退出，不需要显示完成提示
          if (toastIdRef.current) {
            dismiss(toastIdRef.current);
            toastIdRef.current = null;
          }
          break;

        case "failed":
          // 清理失败，显示错误提示
          if (toastIdRef.current) {
            dismiss(toastIdRef.current);
          }
          toastIdRef.current = push({
            variant: "danger",
            description: t("backend.cleanup.failed", {
              defaultValue: "后端连接清理失败",
            }),
            duration: 5000,
          });
          break;
      }
    },
    [push, dismiss, t],
  );

  useEffect(() => {
    if (!canSubscribe) return;

    const unsubscribe =
      window.electron?.onBackendCleanup?.(handleCleanupStatus);

    return () => {
      try {
        unsubscribe?.();
      } catch (error) {
        logger.warn("[Cleanup] unsubscribe failed", { error });
      }
    };
  }, [canSubscribe, handleCleanupStatus]);

  return null;
}

"use client";

import { useCallback } from "react";
import { useToast } from "@/app/components/toast";
import { useI18n } from "@/app/i18n/hooks";

type ToastStatus = "success" | "warning" | "danger";

/**
 * 统一的操作提示 Hook
 *
 * - 提供错误提示（默认失败标题）
 * - 统一成功/警告/失败提示
 * - 提供错误对象到字符串的提取工具
 */
export function useOperationToast() {
  const { push } = useToast();
  const { t } = useI18n();

  const pushErrorToast = useCallback(
    (message: string, title = t("toasts.operationFailedTitle")) => {
      if (!message) return;
      push({
        variant: "danger",
        title,
        description: message,
      });
    },
    [push, t],
  );

  const showNotice = useCallback(
    (message: string, status: ToastStatus) => {
      if (!message) return;
      let title: string;
      switch (status) {
        case "success":
          title = t("toasts.operationSuccessTitle");
          break;
        case "warning":
          title = t("toasts.operationWarningTitle");
          break;
        case "danger":
        default:
          title = t("toasts.operationFailedTitle");
          break;
      }

      push({
        variant: status,
        title,
        description: message,
      });
    },
    [push, t],
  );

  const extractErrorMessage = useCallback((error: unknown): string | null => {
    if (!error) return null;
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && "message" in error) {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === "string") return maybeMessage;
    }
    return null;
  }, []);

  return { pushErrorToast, showNotice, extractErrorMessage };
}

import { ErrorCodes } from "@/app/errors/error-codes";
import i18n from "@/app/i18n/client";
import { withTimeout } from "@/app/lib/utils";

/**
 * 统一的存储操作超时时间（毫秒）
 */
export const DEFAULT_STORAGE_TIMEOUT = 8000;

/**
 * 生成存储操作超时提示文案
 * @param seconds 超时时长（秒），默认与 `DEFAULT_STORAGE_TIMEOUT` 对齐
 * @param customPrefix 自定义前缀，如需覆盖默认的错误码前缀
 */
export function getStorageTimeoutMessage(
  seconds: number = DEFAULT_STORAGE_TIMEOUT / 1000,
  customPrefix?: string,
): string {
  if (customPrefix) {
    return `${customPrefix}（${seconds}秒）`;
  }
  return `[${ErrorCodes.STORAGE_TIMEOUT}] ${i18n.t("errors:storage.timeout", { seconds })}`;
}

/**
 * 为存储 Promise 添加统一的超时保护
 * @param promise 需要保护的 Promise
 * @param message 超时提示文案，默认基于 `getStorageTimeoutMessage`
 * @param timeoutMs 超时时长，默认 `DEFAULT_STORAGE_TIMEOUT`
 */
export function withStorageTimeout<T>(
  promise: Promise<T>,
  message: string = getStorageTimeoutMessage(),
  timeoutMs: number = DEFAULT_STORAGE_TIMEOUT,
): Promise<T> {
  return withTimeout(promise, timeoutMs, message);
}

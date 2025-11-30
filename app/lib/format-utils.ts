import { defaultLocale } from "@/app/i18n/config";
import { LANGUAGE_STORAGE_KEY } from "@/app/i18n/client";

const isBrowser = typeof window !== "undefined";

const getSavedLocale = (): string | undefined => {
  if (!isBrowser) return undefined;
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

const normalizeLocale = (locale?: string): string | undefined => {
  if (!locale) return undefined;
  return locale.trim() || undefined;
};

const VERSION_FULL_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

const VERSION_COMPACT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const CONVERSATION_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

const CONVERSATION_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...CONVERSATION_DATE_OPTIONS,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

// 获取当前激活的 locale；允许显式传入，未传入时回退到 localStorage 或默认值
function getActiveLocale(locale?: string): string {
  const normalized = normalizeLocale(locale);
  if (normalized) return normalized;

  const savedLanguage = getSavedLocale();
  if (savedLanguage) return savedLanguage;

  return defaultLocale;
}

/**
 * 统一的版本时间格式化
 */
export function formatVersionTimestamp(
  timestamp: number,
  mode: "full" | "compact" = "full",
  locale?: string,
): string {
  const activeLocale = getActiveLocale(locale);
  const options =
    mode === "full" ? VERSION_FULL_OPTIONS : VERSION_COMPACT_OPTIONS;
  return new Date(timestamp).toLocaleString(activeLocale, options);
}

/**
 * 统一的会话日期格式化
 */
export function formatConversationDate(
  timestamp: number,
  mode: "date" | "datetime" = "datetime",
  locale?: string,
): string {
  const activeLocale = getActiveLocale(locale);
  const options =
    mode === "date" ? CONVERSATION_DATE_OPTIONS : CONVERSATION_DATETIME_OPTIONS;
  return new Date(timestamp).toLocaleString(activeLocale, options);
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * 相对时间格式化，优先使用 chat/common 命名空间的 time 文案，超出 4 周回退到日期格式
 */
export function formatRelativeTime(
  timestamp: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, options?: any) => string,
): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < MINUTE) return t("common:time.justNow");

  const minutes = Math.floor(diff / MINUTE);
  if (minutes < 60) return t("common:time.minutesAgo", { count: minutes });

  const hours = Math.floor(diff / HOUR);
  if (hours < 24) return t("common:time.hoursAgo", { count: hours });

  const days = Math.floor(diff / DAY);
  if (days < 7) return t("common:time.daysAgo", { count: days });

  const weeks = Math.floor(diff / WEEK);
  if (weeks < 4) return t("common:time.weeksAgo", { count: weeks });

  return formatConversationDate(timestamp, "date");
}

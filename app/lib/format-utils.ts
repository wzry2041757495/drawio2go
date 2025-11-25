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

/**
 * 统一的版本时间格式化
 */
export function formatVersionTimestamp(
  timestamp: number,
  mode: "full" | "compact" = "full",
): string {
  const options =
    mode === "full" ? VERSION_FULL_OPTIONS : VERSION_COMPACT_OPTIONS;
  return new Date(timestamp).toLocaleString("zh-CN", options);
}

/**
 * 统一的会话日期格式化
 */
export function formatConversationDate(
  timestamp: number,
  mode: "date" | "datetime" = "datetime",
): string {
  const options =
    mode === "date" ? CONVERSATION_DATE_OPTIONS : CONVERSATION_DATETIME_OPTIONS;
  return new Date(timestamp).toLocaleString("zh-CN", options);
}

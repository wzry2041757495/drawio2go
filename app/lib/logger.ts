type LogLevel = "debug" | "info" | "warn" | "error" | "silent";
type ConsoleLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};

function resolveGlobalLevel(): LogLevel {
  const envLevel =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase()) ||
    (typeof window !== "undefined" &&
      (window as unknown as Record<string, string>).__DRAWIO2GO_LOG_LEVEL__);

  if (envLevel && envLevel in LEVEL_ORDER) {
    return envLevel as LogLevel;
  }

  return "info";
}

const DEFAULT_LEVEL = resolveGlobalLevel();

const consoleMethod: Record<Exclude<LogLevel, "silent">, ConsoleLevel> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

export function createLogger(componentName: string, level?: LogLevel) {
  const prefix = `[${componentName}]`;
  const currentLevel = level ?? DEFAULT_LEVEL;

  const shouldLog = (incoming: LogLevel) =>
    LEVEL_ORDER[incoming] >= LEVEL_ORDER[currentLevel] &&
    currentLevel !== "silent";

  const log =
    (incoming: Exclude<LogLevel, "silent">) =>
    (...args: unknown[]) => {
      if (!shouldLog(incoming)) return;
      const method = consoleMethod[incoming];
      const logger = (
        console as Record<ConsoleLevel, (...values: unknown[]) => void>
      )[method];
      logger(prefix, ...args);
    };

  return {
    debug: log("debug"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
  };
}

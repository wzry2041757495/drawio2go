type LogLevel = "debug" | "info" | "warn" | "error" | "silent";
type ConsoleLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

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

  const isDev =
    (typeof process !== "undefined" && process.env.NODE_ENV !== "production") ||
    (typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).__DRAWIO2GO_DEV__ ===
        true);

  return isDev ? "debug" : "info";
}

const DEFAULT_LEVEL = resolveGlobalLevel();

const consoleMethod: Record<Exclude<LogLevel, "silent">, ConsoleLevel> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

interface LoggerOptions {
  level?: LogLevel;
  context?: LogContext;
}

export type Logger = ReturnType<typeof createLogger>;

export function createLogger(componentName: string, options?: LoggerOptions) {
  const prefix = `[${componentName}]`;
  const currentLevel = options?.level ?? DEFAULT_LEVEL;
  const baseContext = options?.context;

  const shouldLog = (incoming: LogLevel) =>
    LEVEL_ORDER[incoming] >= LEVEL_ORDER[currentLevel] &&
    currentLevel !== "silent";

  const appendContext = (
    args: unknown[],
    extraContext?: LogContext,
  ): unknown[] => {
    const mergedContext = { ...baseContext, ...extraContext };
    const hasContext = Object.keys(mergedContext).length > 0;
    return hasContext ? [...args, mergedContext] : args;
  };

  const log =
    (incoming: Exclude<LogLevel, "silent">) =>
    (...args: unknown[]) => {
      if (!shouldLog(incoming)) return;
      const method = consoleMethod[incoming];
      const logger = (
        console as Record<ConsoleLevel, (...values: unknown[]) => void>
      )[method];
      logger(prefix, ...appendContext(args));
    };

  return {
    debug: log("debug"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    withContext: (context: LogContext) =>
      createLogger(componentName, {
        level: currentLevel,
        context: { ...baseContext, ...context },
      }),
  };
}

"use client";

import { Component, type ReactNode, useState } from "react";
import { Button, Description, Spinner, Surface } from "@heroui/react";

import { useAppTranslation } from "@/app/i18n/hooks";
import { createLogger } from "@/lib/logger";
import { DB_NAME, resetStorage } from "@/lib/storage";

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export interface ErrorBoundaryProps {
  children: ReactNode;
}

const logger = createLogger("ErrorBoundary");

async function deleteIndexedDbDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("indexedDB.deleteDatabase failed"));
    request.onblocked = () => resolve();
  });
}

async function clearElectronStorage(): Promise<void> {
  if (!window.electronStorage) return;

  const [projects, settings] = await Promise.all([
    window.electronStorage.getAllProjects(),
    window.electronStorage.getAllSettings(),
  ]);

  await Promise.allSettled(
    projects.map((project) =>
      window.electronStorage!.deleteProject(project.uuid),
    ),
  );
  await Promise.allSettled(
    settings.map((setting) =>
      window.electronStorage!.deleteSetting(setting.key),
    ),
  );
}

async function resetPersistentState(): Promise<void> {
  try {
    window.localStorage.clear();
  } catch (error) {
    logger.warn("Failed to clear localStorage", { error });
  }

  try {
    window.sessionStorage.clear();
  } catch (error) {
    logger.warn("Failed to clear sessionStorage", { error });
  }

  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    logger.warn("Failed to clear CacheStorage", { error });
  }

  try {
    await clearElectronStorage();
  } catch (error) {
    logger.error("Failed to clear Electron storage", { error });
  }

  try {
    await deleteIndexedDbDatabase();
  } catch (error) {
    logger.error("Failed to delete IndexedDB database", { error });
  }

  try {
    resetStorage();
  } catch (error) {
    logger.warn("Failed to reset storage singleton", { error });
  }
}

function ErrorBoundaryFallback({ error }: { error: Error | null }) {
  const { t } = useAppTranslation("common");
  const message =
    error?.message ||
    (typeof error === "string" ? error : "") ||
    t("errorBoundary.unknownError");

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <Surface className="w-full max-w-xl rounded-2xl bg-content1 p-6 shadow-2xl outline-none">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <span className="text-lg font-semibold">!</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-foreground">
                {t("errorBoundary.title")}
              </h1>
              <Description className="text-default-600">
                {t("errorBoundary.description")}
              </Description>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onPress={() => window.location.reload()}>
              {t("errorBoundary.refresh")}
            </Button>

            <ResetAppButton />
          </div>

          <details className="rounded-xl border border-default-200 bg-content2 p-4">
            <summary className="cursor-pointer select-none text-sm font-medium text-foreground">
              {t("errorBoundary.details")}
            </summary>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-default-700">
              {message}
              {error?.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </details>
        </div>
      </Surface>
    </div>
  );
}

function ResetAppButton() {
  const { t } = useAppTranslation("common");
  const [isResetting, setIsResetting] = useState(false);

  return (
    <Button
      variant="danger"
      onPress={async () => {
        if (isResetting) return;
        setIsResetting(true);
        try {
          await resetPersistentState();
        } catch (error) {
          logger.error("Reset app failed", { error });
        } finally {
          window.location.reload();
        }
      }}
      isDisabled={isResetting}
    >
      {isResetting ? (
        <span className="flex items-center gap-2">
          <Spinner size="sm" />
          {t("errorBoundary.resetting")}
        </span>
      ) : (
        t("errorBoundary.resetApp")
      )}
    </Button>
  );
}

/**
 * 全局 React Error Boundary（必须使用 class component）
 *
 * - 捕获渲染/生命周期中的未处理错误，避免白屏
 * - 记录错误到统一 logger
 * - 提供刷新与“重置应用（清空本地状态）”的恢复入口
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    logger.error("Unhandled React error", { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorBoundaryFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

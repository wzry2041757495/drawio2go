"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { UpdateCheckResult } from "@/app/hooks/useUpdateChecker";
import { useStorageSettings } from "@/app/hooks/useStorageSettings";
import { useToast } from "@/app/components/toast";
import { useAppTranslation } from "@/app/i18n/hooks";
import { createLogger } from "@/lib/logger";

const logger = createLogger("GlobalUpdateChecker");

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeUrl = (raw: unknown): string | null => normalizeString(raw);

const normalizeUpdateResult = (raw: unknown): UpdateCheckResult | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;

  const hasUpdate = record.hasUpdate === true;
  const currentVersion = normalizeString(record.currentVersion);
  const latestVersion = normalizeString(record.latestVersion);
  const releaseUrl = normalizeUrl(record.releaseUrl);
  const releaseNotes = normalizeString(record.releaseNotes) ?? undefined;

  if (!currentVersion || !latestVersion || !releaseUrl) return null;

  return { hasUpdate, currentVersion, latestVersion, releaseUrl, releaseNotes };
};

const parseBooleanSetting = (
  raw: string | null,
  defaultValue: boolean,
): boolean => {
  if (raw === null) return defaultValue;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return defaultValue;
  return trimmed !== "0" && trimmed !== "false";
};

const openExternalUrl = async (rawUrl: string): Promise<void> => {
  const url = normalizeUrl(rawUrl);
  if (!url) return;

  if (typeof window !== "undefined") {
    const electron = window.electron;
    if (electron?.openReleasePage) {
      await electron.openReleasePage(url);
      return;
    }

    if (electron?.openExternal) {
      await electron.openExternal(url);
      return;
    }
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

/**
 * 全局更新检查订阅组件（无 UI）
 *
 * - 应用启动后即订阅主进程广播的 `update:available`
 * - 受 `update.autoCheck` 设置控制
 * - 当检测到有新版本时弹出 Toast（含去重）
 */
export default function GlobalUpdateChecker() {
  const { t } = useAppTranslation("settings");
  const { push } = useToast();
  const { getSetting, subscribeSettingsUpdates } = useStorageSettings();

  const [autoCheckEnabled, setAutoCheckEnabled] = useState<boolean | null>(
    null,
  );

  const canSubscribe = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.electron?.onUpdateAvailable === "function",
    [],
  );

  const lastNotifiedVersionRef = useRef<string | null>(null);

  const loadAutoCheckSetting = useCallback(async () => {
    try {
      const raw = await getSetting("update.autoCheck");
      setAutoCheckEnabled(parseBooleanSetting(raw, true));
    } catch (error) {
      logger.warn("[Update] load update.autoCheck failed", { error });
      setAutoCheckEnabled(true);
    }
  }, [getSetting]);

  useEffect(() => {
    void loadAutoCheckSetting();
  }, [loadAutoCheckSetting]);

  useEffect(() => {
    const unsubscribe = subscribeSettingsUpdates((detail) => {
      if (detail.type !== "update") return;
      void loadAutoCheckSetting();
    });

    return unsubscribe;
  }, [loadAutoCheckSetting, subscribeSettingsUpdates]);

  const notifyIfHasUpdate = useCallback(
    (result: UpdateCheckResult) => {
      if (!result.hasUpdate) return;

      if (lastNotifiedVersionRef.current === result.latestVersion) {
        return;
      }

      lastNotifiedVersionRef.current = result.latestVersion;

      push({
        variant: "info",
        duration: 10_000,
        title: t("about.update.toastTitle", {
          defaultValue: "New version available",
        }),
        description: t("about.update.toastDescription", {
          defaultValue:
            "v{{latest}} is available (current v{{current}}). Click to open download page.",
          latest: result.latestVersion,
          current: result.currentVersion,
        }),
        action: {
          label: t("about.update.toastAction", {
            defaultValue: "Open download page",
          }),
          onPress: async () => {
            try {
              await openExternalUrl(result.releaseUrl);
            } catch (error) {
              logger.warn("[Update] openReleasePage failed", { error });
            }
          },
        },
      });
    },
    [push, t],
  );

  useEffect(() => {
    if (!canSubscribe) return;
    if (autoCheckEnabled !== true) return;

    const unsubscribe = window.electron?.onUpdateAvailable?.((rawResult) => {
      const result = normalizeUpdateResult(rawResult);
      if (!result) return;
      notifyIfHasUpdate(result);
    });

    return () => {
      try {
        unsubscribe?.();
      } catch (error) {
        logger.warn("[Update] unsubscribe failed", { error });
      }
    };
  }, [autoCheckEnabled, canSubscribe, notifyIfHasUpdate]);

  return null;
}

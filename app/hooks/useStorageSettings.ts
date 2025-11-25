"use client";

import { useState, useEffect, useCallback } from "react";
import { getStorage } from "@/app/lib/storage";
import type { LLMConfig } from "@/app/types/chat";
import { normalizeLLMConfig } from "@/app/lib/config-utils";
import { runStorageTask } from "@/app/lib/utils";

/**
 * 设置管理 Hook
 *
 * 提供设置的读取、保存和删除功能，
 * 自动处理加载状态和错误
 */
export function useStorageSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 获取设置值
   */
  const getSetting = useCallback(
    async (key: string): Promise<string | null> => {
      return runStorageTask(
        async () => {
          const storage = await getStorage();
          return await storage.getSetting(key);
        },
        { setLoading, setError },
      );
    },
    [setLoading],
  );

  /**
   * 设置值
   */
  const setSetting = useCallback(
    async (key: string, value: string): Promise<void> => {
      await runStorageTask(
        async () => {
          const storage = await getStorage();
          await storage.setSetting(key, value);
        },
        { setLoading, setError },
      );
    },
    [setLoading],
  );

  /**
   * 获取所有设置
   */
  const getAllSettings = useCallback(async () => {
    return runStorageTask(
      async () => {
        const storage = await getStorage();
        return await storage.getAllSettings();
      },
      { setLoading, setError },
    );
  }, [setLoading]);

  /**
   * 获取 LLM 配置（已规范化）
   */
  const getLLMConfig = useCallback(async (): Promise<LLMConfig | null> => {
    return runStorageTask(
      async () => {
        const value = await getSetting("llmConfig");
        if (!value) {
          return null;
        }
        const parsed = JSON.parse(value);
        return normalizeLLMConfig(parsed);
      },
      { setLoading, setError },
    );
  }, [getSetting, setLoading]);

  /**
   * 保存 LLM 配置（自动规范化）
   */
  const saveLLMConfig = useCallback(
    async (config: Partial<LLMConfig>): Promise<void> => {
      await runStorageTask(
        async () => {
          const normalized = normalizeLLMConfig(config);
          await setSetting("llmConfig", JSON.stringify(normalized));
        },
        { setLoading, setError },
      );
    },
    [setSetting, setLoading],
  );

  /**
   * 获取默认路径
   */
  const getDefaultPath = useCallback(async (): Promise<string | null> => {
    return runStorageTask(
      async () => {
        return await getSetting("defaultPath");
      },
      { setLoading, setError },
    );
  }, [getSetting, setLoading]);

  /**
   * 保存默认路径
   */
  const saveDefaultPath = useCallback(
    async (path: string): Promise<void> => {
      await runStorageTask(
        async () => {
          await setSetting("defaultPath", path);
        },
        { setLoading, setError },
      );
    },
    [setSetting, setLoading],
  );

  // 初始化时检查存储可用性
  useEffect(() => {
    void runStorageTask(
      async () => {
        await getStorage();
      },
      { setLoading, setError },
    );
  }, []);

  return {
    loading,
    error,
    getSetting,
    setSetting,
    getAllSettings,
    getLLMConfig,
    saveLLMConfig,
    getDefaultPath,
    saveDefaultPath,
  };
}

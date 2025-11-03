"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LLM_CONFIG, normalizeLLMConfig } from "@/app/lib/llm-config";
import { LLMConfig } from "@/app/types/chat";

const STORAGE_KEY = "llmConfig";

export function useLLMConfig() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalized = normalizeLLMConfig(parsed);
        setConfig(normalized);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } else {
        setConfig({ ...DEFAULT_LLM_CONFIG });
      }
      setError(null);
    } catch (e) {
      console.error("加载 LLM 配置失败:", e);
      setError("加载配置失败");
      setConfig({ ...DEFAULT_LLM_CONFIG });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveConfig = useCallback((newConfig: LLMConfig) => {
    try {
      const normalized = normalizeLLMConfig(newConfig);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
      setConfig(normalized);
      setError(null);
      return normalized;
    } catch (e) {
      console.error("保存 LLM 配置失败:", e);
      setError("保存配置失败");
      throw e;
    }
  }, []);

  return { config, isLoading, error, saveConfig };
}

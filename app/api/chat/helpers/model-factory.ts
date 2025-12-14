import type { LLMConfig } from "@/app/types/chat";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

type ModelFactory = (config: LLMConfig) => LanguageModel;

const FACTORIES: Record<string, ModelFactory> = {
  "openai-reasoning": (config) => {
    const openaiProvider = createOpenAI({
      baseURL: config.apiUrl,
      apiKey: config.apiKey || "dummy-key",
    });
    return openaiProvider.chat(config.modelName);
  },
  "deepseek-native": (config) => {
    const deepseekProvider = createDeepSeek({
      baseURL: config.apiUrl,
      apiKey: config.apiKey || "dummy-key",
    });
    return deepseekProvider(config.modelName);
  },
  anthropic: (config) => {
    const anthropicProvider = createAnthropic({
      baseURL: config.apiUrl || "https://api.anthropic.com",
      apiKey: config.apiKey || "",
    });
    return anthropicProvider(config.modelName);
  },
};

const DEFAULT_FACTORY: ModelFactory = (config) => {
  const compatibleProvider = createOpenAICompatible({
    name: config.providerType,
    baseURL: config.apiUrl,
    apiKey: config.apiKey || "dummy-key",
  });
  return compatibleProvider(config.modelName);
};

export function createModelFromConfig(config: LLMConfig): LanguageModel {
  const factory = FACTORIES[config.providerType] ?? DEFAULT_FACTORY;
  return factory(config);
}

import type { ComponentType } from "react";
import { Cpu } from "lucide-react";
import {
  Anthropic,
  DeepSeek,
  Gemini,
  Google,
  Meta,
  OpenAI,
  Minimax,
  Qwen,
  Zhipu,
  LongCat,
} from "@lobehub/icons";
import type { ProviderType } from "@/app/types/chat";

type IconComponent = ComponentType<{
  size?: number | string;
  className?: string;
  color?: string;
}>;

export interface IconAsset {
  Icon: IconComponent;
  alt: string;
}

const fallbackIcon: IconAsset = {
  Icon: Cpu,
  alt: "Default model",
};

const deepseekIcon: IconAsset = {
  Icon: DeepSeek,
  alt: "DeepSeek",
};

const providerIconMap: Record<string, IconAsset> = {
  openai: { Icon: OpenAI, alt: "OpenAI" },
  "openai-compatible": { Icon: OpenAI, alt: "OpenAI" },
  "openai-reasoning": { Icon: OpenAI, alt: "OpenAI" },
  anthropic: { Icon: Anthropic, alt: "Anthropic" },
  claude: { Icon: Anthropic, alt: "Anthropic" },
  google: { Icon: Google, alt: "Google" },
  gemini: { Icon: Google, alt: "Google Gemini" },
  meta: { Icon: Meta, alt: "Meta" },
  llama: { Icon: Meta, alt: "Meta" },
  facebook: { Icon: Meta, alt: "Meta" },
  "deepseek-native": deepseekIcon,
  deepseek: deepseekIcon,
  minimax: { Icon: Minimax, alt: "Minimax" },
  qwen: { Icon: Qwen, alt: "Qwen" },
  zhipu: { Icon: Zhipu, alt: "智谱AI" },
  glm: { Icon: Zhipu, alt: "智谱AI" },
  chatglm: { Icon: Zhipu, alt: "智谱AI" },
  bigmodel: { Icon: Zhipu, alt: "智谱AI" },
  longcat: { Icon: LongCat, alt: "LongCat" },
};

const modelIconRules: Array<{ pattern: RegExp; asset: IconAsset }> = [
  { pattern: /gpt[-_]?4o/i, asset: { Icon: OpenAI, alt: "GPT-4o" } },
  {
    pattern: /\bo[13](?:[-_]?mini|[-_]?preview)?/i,
    asset: { Icon: OpenAI, alt: "OpenAI o-series" },
  },
  {
    pattern: /claude[-_]?3(?:\.5)?/i,
    asset: { Icon: Anthropic, alt: "Claude 3" },
  },
  {
    pattern: /gemini[-_]?((1\.5)|(2\.0)|(2\.5)|(3))/i,
    asset: { Icon: Gemini, alt: "Gemini" },
  },
  { pattern: /llama\s?\d*/i, asset: { Icon: Meta, alt: "Llama" } },
  { pattern: /deepseek/i, asset: deepseekIcon },

  // Minimax 模型
  { pattern: /minimax/i, asset: { Icon: Minimax, alt: "Minimax" } },

  // Qwen 模型
  { pattern: /qwen/i, asset: { Icon: Qwen, alt: "Qwen" } },

  // 智谱AI 模型（GLM系列）
  {
    pattern: /(chatglm|glm[-_]?\d|zhipu)/i,
    asset: { Icon: Zhipu, alt: "智谱AI" },
  },

  // LongCat 模型
  { pattern: /longcat/i, asset: { Icon: LongCat, alt: "LongCat" } },
];

const normalizeKey = (value?: string | null) =>
  value?.toLowerCase().trim() ?? "";

/**
 * 从 apiUrl 中提取供应商关键词
 * @param apiUrl - API 端点 URL
 * @returns 供应商关键词（用于匹配 providerIconMap）
 */
function extractVendorFromUrl(
  apiUrl: string | null | undefined,
): string | null {
  if (!apiUrl) return null;

  try {
    const url = new URL(apiUrl);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    const fullUrl = `${hostname}${pathname}`;

    // 按优先级匹配
    if (fullUrl.includes("minimax")) return "minimax";
    if (fullUrl.includes("dashscope") || fullUrl.includes("aliyuncs"))
      return "qwen";
    if (fullUrl.includes("bigmodel")) return "bigmodel";
    if (fullUrl.includes("longcat")) return "longcat";

    return null;
  } catch {
    // 如果 URL 解析失败，尝试简单字符串匹配
    const lowerUrl = apiUrl.toLowerCase();
    if (lowerUrl.includes("minimax")) return "minimax";
    if (lowerUrl.includes("dashscope") || lowerUrl.includes("aliyuncs"))
      return "qwen";
    if (lowerUrl.includes("bigmodel")) return "bigmodel";
    if (lowerUrl.includes("longcat")) return "longcat";

    return null;
  }
}

export type ModelIconResult = IconAsset;

export function getModelIcon(
  modelId?: string | null,
  modelName?: string | null,
  providerId?: string | null,
  providerType?: ProviderType | null,
  apiUrl?: string | null,
): ModelIconResult {
  const normalizedName = normalizeKey(modelName || modelId);

  if (normalizedName) {
    const matchedRule = modelIconRules.find((rule) =>
      rule.pattern.test(normalizedName),
    );

    if (matchedRule) {
      return matchedRule.asset;
    }
  }

  const providerKey = normalizeKey(providerId);

  if (providerIconMap[providerKey]) {
    return providerIconMap[providerKey];
  }

  const vendorKey = extractVendorFromUrl(apiUrl);
  if (vendorKey && providerIconMap[vendorKey]) {
    return providerIconMap[vendorKey];
  }

  const providerTypeKey = normalizeKey(providerType ?? undefined);
  if (providerIconMap[providerTypeKey]) {
    return providerIconMap[providerTypeKey];
  }

  return fallbackIcon;
}

export { fallbackIcon, modelIconRules, providerIconMap };

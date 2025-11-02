import { LLMConfig, ProviderType } from "@/app/types/chat";

export const DEFAULT_SYSTEM_PROMPT = `你是一个专业的 DrawIO XML 绘制助手。你的任务是帮助用户创建、修改和优化 DrawIO 图表。

你需要：
1. 理解用户对图表的描述和需求
2. 生成或修改符合 DrawIO XML 格式的代码
3. 确保 XML 结构正确，包含必要的元数据、样式和连接关系
4. 提供清晰的节点布局和美观的视觉效果
5. 解释你所做的修改和设计决策

DrawIO XML 基本规范：
- 使用 <mxGraphModel> 作为根元素
- 使用 <mxCell> 定义节点和连接
- 使用 style 属性定义样式（形状、颜色、字体等）
- 使用 mxGeometry 定义位置和大小
- 保持 ID 的唯一性

请始终确保生成的 XML 可以被 DrawIO 正确解析和渲染。`;

export const DEFAULT_API_URL = "https://api.deepseek.com/v1";

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  apiUrl: DEFAULT_API_URL,
  apiKey: "",
  temperature: 0.3,
  modelName: "deepseek-chat",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  providerType: "deepseek",
  maxToolRounds: 5,
};

const PROVIDER_TYPES: ProviderType[] = ["openai-reasoning", "openai-compatible", "deepseek"];

export const isProviderType = (value: unknown): value is ProviderType =>
  typeof value === "string" && PROVIDER_TYPES.includes(value as ProviderType);

export const resolveProviderType = (
  providerType?: unknown,
  legacyFlag?: unknown
): ProviderType => {
  if (isProviderType(providerType)) {
    return providerType;
  }

  // 向后兼容：将旧的 provider 类型映射到新类型
  if (typeof providerType === "string") {
    if (providerType === "openai" || providerType === "openai-response") {
      return "openai-compatible";
    }
    if (providerType === "anthropic") {
      return "openai-compatible";
    }
  }

  // 兼容旧的 legacyFlag
  if (legacyFlag === true) {
    return "openai-compatible";
  }

  // 默认使用 openai-compatible
  return "openai-compatible";
};

export const normalizeApiUrl = (value?: string, fallback: string = DEFAULT_API_URL): string => {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");

  if (/\/v\d+($|\/)/i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}/v1`;
};

export const normalizeLLMConfig = (
  value?: Partial<LLMConfig> & { useLegacyOpenAIFormat?: boolean }
): LLMConfig => {
  const providerType = resolveProviderType(value?.providerType, value?.useLegacyOpenAIFormat);

  return {
    apiUrl: normalizeApiUrl(value?.apiUrl),
    apiKey: typeof value?.apiKey === "string" ? value.apiKey : DEFAULT_LLM_CONFIG.apiKey,
    temperature:
      typeof value?.temperature === "number" && Number.isFinite(value.temperature)
        ? value.temperature
        : DEFAULT_LLM_CONFIG.temperature,
    modelName:
      typeof value?.modelName === "string" && value.modelName.trim()
        ? value.modelName
        : DEFAULT_LLM_CONFIG.modelName,
    systemPrompt:
      typeof value?.systemPrompt === "string"
        ? value.systemPrompt
        : DEFAULT_LLM_CONFIG.systemPrompt,
    providerType,
    maxToolRounds:
      typeof value?.maxToolRounds === "number" && Number.isFinite(value.maxToolRounds)
        ? value.maxToolRounds
        : DEFAULT_LLM_CONFIG.maxToolRounds,
  };
};

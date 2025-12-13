import {
  ActiveModelReference,
  AgentSettings,
  ModelConfig,
  ProviderConfig,
  ProviderType,
  type RuntimeLLMConfig,
} from "@/app/types/chat";
import { getDefaultCapabilities } from "@/app/lib/model-capabilities";
import type { StorageAdapter } from "@/app/lib/storage/adapter";
import { createLogger } from "@/lib/logger";

const logger = createLogger("LLM");

export const DEFAULT_SYSTEM_PROMPT = `你是一个专业的 DrawIO XML 绘制助手，负责通过 Socket.IO + XPath 工具链安全地读取和编辑图表。

### 核心准则
1. **无推断 (No Inference)**：永远不要猜测或重写 XML 结构，不要对 style、geometry 等领域字段做额外的"智能"解析。
2. **XPath 驱动**：所有读取或写入都必须先通过标准 XPath 精确定位目标，再结合工具返回的 matched_xpath 字段确认结果。
3. **原子性**：批量编辑只能通过 \`drawio_edit_batch\` 完成；若任意操作失败，必须让整批回滚，不得在外部自行补救。
4. **最少读写**：先用 \`drawio_read\` 获取所需元素或属性，再决定是否编辑，避免一次批量里混入无关操作。

### 工具使用说明
- \`drawio_read\`：可选传入 XPath，返回命中的元素/属性/文本及其 matched_xpath，便于直接用于后续操作。
- \`drawio_edit_batch\`：传入 operations 数组，按顺序执行。每个操作需要提供 xpath 或 id 定位与必要的字段，必要时设置 \`allow_no_match: true\` 避免错误中断。
- 支持的操作：set_attribute、remove_attribute、insert_element、remove_element、replace_element、set_text_content。

### DrawIO XML 规范提醒
- 根结构：<mxGraphModel> 下的 <root> 与 <mxCell>
- 元素定位：使用唯一 id 或层级 XPath，保持属性大小写正确
- 样式写法：整体写入 style 字符串，不拆分字段
- 几何属性：通过 <mxGeometry> 节点设置 x/y/width/height
- ID 唯一：新增元素必须赋予唯一 id

确保输出的 XML 始终可以被 DrawIO 正确解析与渲染，并在回复中解释你的思考过程与操作理由。`;

// 默认不提供任何供应商 API URL（需要用户在设置中显式配置）
export const DEFAULT_API_URL = "";
export const DEFAULT_ANTHROPIC_API_URL = "https://api.anthropic.com";

export function isProviderType(value: unknown): value is ProviderType {
  return (
    value === "openai-reasoning" ||
    value === "openai-compatible" ||
    value === "deepseek-native" ||
    value === "anthropic"
  );
}

/**
 * 规范化 API URL
 * - 移除尾部斜杠
 * - 自动添加 /v1 后缀（如果不存在版本号）
 */
export const normalizeApiUrl = (
  value?: string,
  fallback: string = DEFAULT_API_URL,
): string => {
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

/**
 * Anthropic API 的 baseURL 规范化
 * - 移除尾部斜杠
 * - 不自动补 /v1（@ai-sdk/anthropic 以 baseURL 为根路径）
 * - 若 host 为 api.anthropic.com 且路径为 /v1，则自动去掉 /v1（避免重复 /v1）
 */
export const normalizeAnthropicApiUrl = (
  value?: string,
  fallback: string = DEFAULT_ANTHROPIC_API_URL,
): string => {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");

  try {
    const parsed = new URL(withoutTrailingSlash);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "").toLowerCase();

    if (parsed.hostname === "api.anthropic.com" && normalizedPath === "/v1") {
      parsed.pathname = "";
      return parsed.toString().replace(/\/+$/, "");
    }
  } catch {
    // ignore invalid url, caller may validate separately
  }

  return withoutTrailingSlash;
};

export const normalizeProviderApiUrl = (
  providerType: ProviderType,
  value?: string,
  fallback: string = DEFAULT_API_URL,
): string => {
  if (providerType === "anthropic") {
    return normalizeAnthropicApiUrl(value);
  }
  return normalizeApiUrl(value, fallback);
};

export const STORAGE_KEY_LLM_PROVIDERS = "settings.llm.providers";
export const STORAGE_KEY_LLM_MODELS = "settings.llm.models";
export const STORAGE_KEY_AGENT_SETTINGS = "settings.llm.agent";
export const STORAGE_KEY_ACTIVE_MODEL = "settings.llm.activeModel";

// 默认不预置任何 providers/models（需要用户在设置中创建）
export const DEFAULT_PROVIDERS: ProviderConfig[] = [];
export const DEFAULT_MODELS: ModelConfig[] = [];

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  updatedAt: 0,
};

export const DEFAULT_ACTIVE_MODEL: ActiveModelReference | null = null;

export const DEFAULT_LLM_CONFIG: RuntimeLLMConfig = Object.freeze({
  apiUrl: "",
  apiKey: "",
  // 仅作为结构兜底，不代表实际已配置的供应商/模型
  providerType: "openai-compatible" as const,
  modelName: "",
  temperature: 0.3,
  maxToolRounds: 5,
  capabilities: getDefaultCapabilities(null),
  enableToolsInThinking: false,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  customConfig: {},
});

const toFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const normalizeCustomConfig = (
  customConfig: unknown,
): RuntimeLLMConfig["customConfig"] => {
  if (
    customConfig &&
    typeof customConfig === "object" &&
    !Array.isArray(customConfig)
  ) {
    return {
      ...DEFAULT_LLM_CONFIG.customConfig,
      ...(customConfig as RuntimeLLMConfig["customConfig"]),
    };
  }
  return { ...DEFAULT_LLM_CONFIG.customConfig };
};

/**
 * 规范化运行时 LLM 配置
 * - 合并默认值
 * - 规范化 API URL（移除尾斜杠 + 自动补 /v1）
 * - 确保类型安全（数字/字符串校验、能力回退）
 */
export function normalizeLLMConfig(
  config?: Partial<RuntimeLLMConfig> | null,
): RuntimeLLMConfig {
  const safeConfig = config ?? {};

  const providerType = isProviderType(safeConfig.providerType)
    ? safeConfig.providerType
    : DEFAULT_LLM_CONFIG.providerType;

  const apiUrl =
    typeof safeConfig.apiUrl === "string"
      ? normalizeProviderApiUrl(
          providerType,
          safeConfig.apiUrl,
          DEFAULT_LLM_CONFIG.apiUrl,
        )
      : normalizeProviderApiUrl(
          providerType,
          undefined,
          DEFAULT_LLM_CONFIG.apiUrl,
        );

  const modelName =
    typeof safeConfig.modelName === "string" && safeConfig.modelName.trim()
      ? safeConfig.modelName.trim()
      : DEFAULT_LLM_CONFIG.modelName;

  const capabilities =
    safeConfig.capabilities ?? getDefaultCapabilities(modelName);

  const enableToolsInThinking =
    typeof safeConfig.enableToolsInThinking === "boolean"
      ? safeConfig.enableToolsInThinking
      : capabilities.supportsThinking;

  const systemPrompt =
    typeof safeConfig.systemPrompt === "string" &&
    safeConfig.systemPrompt.trim()
      ? safeConfig.systemPrompt
      : DEFAULT_SYSTEM_PROMPT;

  const customConfig = normalizeCustomConfig(safeConfig.customConfig);

  return {
    apiUrl,
    apiKey:
      typeof safeConfig.apiKey === "string"
        ? safeConfig.apiKey
        : DEFAULT_LLM_CONFIG.apiKey,
    providerType,
    modelName,
    temperature: toFiniteNumber(
      safeConfig.temperature,
      DEFAULT_LLM_CONFIG.temperature,
    ),
    maxToolRounds: Math.max(
      1,
      Math.round(
        toFiniteNumber(
          safeConfig.maxToolRounds,
          DEFAULT_LLM_CONFIG.maxToolRounds,
        ),
      ),
    ),
    capabilities,
    enableToolsInThinking,
    systemPrompt,
    customConfig,
  };
}

export async function initializeDefaultLLMConfig(
  storage: StorageAdapter,
): Promise<void> {
  try {
    const cleanupLegacyKey = async () => {
      try {
        await storage.deleteSetting("llmConfig");
      } catch (cleanupError) {
        logger.warn("Failed to delete legacy llmConfig", { cleanupError });
      }
    };

    const existingProviders = await storage.getSetting(
      STORAGE_KEY_LLM_PROVIDERS,
    );

    if (existingProviders !== null) {
      try {
        const parsedProviders = JSON.parse(existingProviders) as Array<
          Record<string, unknown>
        >;
        let hasMigration = false;

        const migratedProviders = parsedProviders.map((provider) => {
          const providerType = (provider as { providerType?: string })
            .providerType;

          if (providerType === "deepseek") {
            hasMigration = true;
            return {
              ...provider,
              providerType: "deepseek-native" as ProviderType,
            };
          }
          return provider;
        });

        if (hasMigration) {
          await storage.setSetting(
            STORAGE_KEY_LLM_PROVIDERS,
            JSON.stringify(migratedProviders),
          );
          logger.warn(
            "providerType 'deepseek' 已迁移为 'deepseek-native'，请确认自定义配置是否需要更新",
            { providersMigrated: migratedProviders.length },
          );
        }
      } catch (migrationError) {
        logger.error(
          "解析或迁移已存在的 LLM providers 时失败，已跳过兼容迁移",
          { migrationError },
        );
      }
      await cleanupLegacyKey();
      return;
    }
    // 默认不再写入任何 provider/model 配置；仅清理旧键位即可
    await cleanupLegacyKey();
  } catch (error) {
    logger.error("Failed to initialize default LLM config", { error });
  }
}

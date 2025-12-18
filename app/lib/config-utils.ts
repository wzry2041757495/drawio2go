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

export const DEFAULT_SYSTEM_PROMPT = `You are a professional DrawIO diagram assistant that safely reads and edits diagrams via XPath-driven tools.

## Language Requirement
**Always respond in the same language the user uses.** If the user writes in Chinese, respond in Chinese. If in English, respond in English. Match the user's language exactly.

## Core Principles
1. **No Inference**: Never guess or rewrite XML structure. Do not add "smart" parsing for style, geometry, or other domain fields.
2. **XPath-Driven**: All read/write operations must use XPath or element ID for precise targeting. Use the \`matched_xpath\` field from results for subsequent operations.
3. **Atomicity**: Batch edits via \`drawio_edit_batch\` are all-or-nothing. If any operation fails, the entire batch rolls back automatically.
4. **Minimal Changes**: Always use \`drawio_read\` first to understand the current state before editing. Avoid unnecessary operations in a batch.

## Tool Usage Guide

### drawio_read
Query diagram content. Three modes available:
- **ls mode** (default): List all mxCells. Use \`filter\` to show only "vertices" (shapes) or "edges" (connectors).
- **id mode**: Query by mxCell ID (string or array). Fastest for known elements.
- **xpath mode**: XPath expression for complex queries.

Returns \`matched_xpath\` for each result, which can be used directly in edit operations.

### drawio_edit_batch
Batch edit with atomic execution. Each operation requires:
- **Locator**: Either \`id\` (preferred, auto-converts to XPath) or \`xpath\`
- **Operation type**: set_attribute, remove_attribute, insert_element, remove_element, replace_element, set_text_content

Use \`allow_no_match: true\` to skip operations when target not found instead of failing.

### drawio_overwrite
Replace entire diagram XML. Use only for template replacement or complete restructuring.

## DrawIO XML Structure Reference

\`\`\`xml
<mxGraphModel>
  <root>
    <mxCell id="0"/>                          <!-- Root layer -->
    <mxCell id="1" parent="0"/>               <!-- Default parent -->
    <mxCell id="node-1" value="Label"
            style="rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf"
            vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="edge-1" value=""
            style="edgeStyle=orthogonalEdgeStyle"
            edge="1" parent="1" source="node-1" target="node-2">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>
\`\`\`

### Key Attributes
- **vertex="1"**: Shape/node element
- **edge="1"**: Connector/line element
- **parent**: Parent cell ID (usually "1" for top-level elements)
- **source/target**: For edges, reference the connected vertex IDs
- **value**: Display text/label

### Common Style Properties
| Property | Example | Description |
|----------|---------|-------------|
| fillColor | #dae8fc | Background color |
| strokeColor | #6c8ebf | Border color |
| rounded | 0 or 1 | Rounded corners |
| shape | ellipse, rhombus | Shape type |
| fontColor | #333333 | Text color |
| fontSize | 12 | Text size |
| edgeStyle | orthogonalEdgeStyle | Edge routing |

### insert_element XML Format Rules

**Must follow these rules:**
1. Style: semicolon-separated, NO trailing semicolon
   - ✓ \`style="ellipse;fillColor=#ffffff;strokeColor=#000000"\`
   - ✗ \`style="ellipse;fillColor=#ffffff;strokeColor=#000000;"\`

2. Self-closing tags: NO space before />
   - ✓ \`<mxGeometry x="100" y="100" width="80" height="80" as="geometry"/>\`
   - ✗ \`<mxGeometry x="100" y="100" width="80" height="80" as="geometry" />\`

3. Avoid style props that may cause inconsistency:
   - Avoid: \`whiteSpace=wrap\`, \`html=1\`, \`aspect=fixed\`

4. Targeting rules:
   - **NEVER** use \`id: "1"\` - this is DrawIO's internal parent node
   - Use \`xpath: "/mxfile/diagram/mxGraphModel/root"\` for adding top-level elements

## Best Practices
1. **Read before edit**: Always query current state before modifications.
2. **Use ID when known**: \`id\` is faster and more reliable than XPath.
3. **Generate unique IDs**: For new elements, use UUIDs or descriptive prefixes.
4. **Preserve structure**: Maintain proper parent-child relationships.
5. **Explain your actions**: Describe what you're doing and why.

Always ensure generated XML is valid and can be properly parsed by DrawIO.`;

// 各供应商官方 API URL 默认值
export const DEFAULT_OPENAI_API_URL = "https://api.openai.com/v1";
export const DEFAULT_DEEPSEEK_API_URL = "https://api.deepseek.com";
export const DEFAULT_ANTHROPIC_API_URL = "https://api.anthropic.com";
// 通用默认值（用于 OpenAI 兼容类型）
export const DEFAULT_API_URL = DEFAULT_OPENAI_API_URL;

export function stripTrailingSlashes(input: string): string {
  let end = input.length;
  while (end > 0 && input.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return end === input.length ? input : input.slice(0, end);
}

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

  const withoutTrailingSlash = stripTrailingSlashes(trimmed);

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

  const withoutTrailingSlash = stripTrailingSlashes(trimmed);

  try {
    const parsed = new URL(withoutTrailingSlash);
    const normalizedPath = stripTrailingSlashes(parsed.pathname).toLowerCase();

    if (parsed.hostname === "api.anthropic.com" && normalizedPath === "/v1") {
      parsed.pathname = "";
      return stripTrailingSlashes(parsed.toString());
    }
  } catch {
    // ignore invalid url, caller may validate separately
  }

  return withoutTrailingSlash;
};

/**
 * 获取指定供应商类型的默认 API URL
 */
export const getDefaultApiUrlForProvider = (
  providerType: ProviderType,
): string => {
  switch (providerType) {
    case "anthropic":
      return DEFAULT_ANTHROPIC_API_URL;
    case "deepseek-native":
      return DEFAULT_DEEPSEEK_API_URL;
    case "openai-reasoning":
    case "openai-compatible":
    default:
      return DEFAULT_OPENAI_API_URL;
  }
};

export const normalizeProviderApiUrl = (
  providerType: ProviderType,
  value?: string,
  fallback?: string,
): string => {
  const defaultUrl = fallback ?? getDefaultApiUrlForProvider(providerType);
  if (providerType === "anthropic") {
    return normalizeAnthropicApiUrl(value, defaultUrl);
  }
  return normalizeApiUrl(value, defaultUrl);
};

export const STORAGE_KEY_LLM_PROVIDERS = "settings.llm.providers";
export const STORAGE_KEY_LLM_MODELS = "settings.llm.models";
export const STORAGE_KEY_AGENT_SETTINGS = "settings.llm.agent";
export const STORAGE_KEY_ACTIVE_MODEL = "settings.llm.activeModel";

export const STORAGE_KEY_GENERAL_SETTINGS = "settings.general";

export interface GeneralSettings {
  // 默认展开侧边栏
  sidebarExpanded: boolean;
  // 默认文件路径
  defaultPath: string;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  sidebarExpanded: true,
  defaultPath: "",
};

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
  maxToolRounds: 20,
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
      ? normalizeProviderApiUrl(providerType, safeConfig.apiUrl)
      : normalizeProviderApiUrl(providerType, undefined);

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
    const existingProviders = await storage.getSetting(
      STORAGE_KEY_LLM_PROVIDERS,
    );

    if (existingProviders !== null) {
      return;
    }
    // 默认不再写入任何 provider/model 配置
  } catch (error) {
    logger.error("Failed to initialize default LLM config", { error });
  }
}

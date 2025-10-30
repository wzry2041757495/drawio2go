# 里程碑 5：类型定义与优化

**状态**：⏸️ 待执行
**预计耗时**：30 分钟
**依赖**：里程碑 1-4

## 目标
完善 TypeScript 类型定义，优化代码结构和用户体验

## 任务清单

### 1. 创建统一的类型定义文件
- [ ] 创建 `app/types/chat.ts`
- [ ] 定义供应商类型枚举：
  ```typescript
  /**
   * 支持的 AI 供应商类型
   * - openai: 使用 OpenAI Chat API (.chat 方法)
   * - openai-response: 使用 OpenAI Responses API (AI SDK 5 默认)
   * - deepseek: DeepSeek API (预留扩展)
   * - anthropic: Anthropic Claude API (预留扩展)
   */
  export type ProviderType = 'openai' | 'openai-response' | 'deepseek' | 'anthropic';
  ```

- [ ] 定义 LLM 配置类型：
  ```typescript
  /**
   * LLM 配置接口
   */
  export interface LLMConfig {
    /** API 请求地址 */
    apiUrl: string;
    /** API 密钥 */
    apiKey: string;
    /** 温度参数（0-2） */
    temperature: number;
    /** 模型名称 */
    modelName: string;
    /** 系统提示词 */
    systemPrompt: string;
    /** 供应商类型 */
    providerType: ProviderType;
    /** 最大工具调用轮次 */
    maxToolRounds: number;
  }
  ```

  **供应商类型说明**：
  - **openai**: 使用 `createOpenAI().chat()` 方法，调用传统的 OpenAI Chat Completions API
  - **openai-response**: 使用 `createOpenAI()()` 默认方法，调用 AI SDK 5 的 Responses API，支持更多功能（Web Search、File Search、Image Generation、Code Interpreter 等）
  - **deepseek**: 使用 DeepSeek 官方 Provider（需安装 `@ai-sdk/deepseek`，预留）
  - **anthropic**: 使用 Anthropic Claude Provider（需安装 `@ai-sdk/anthropic`，预留）

  详细 API 区别参见 `.claude/docs/aisdk-openai.md` 第102-106行和第125-287行。

- [ ] 定义工具调用相关类型：
  ```typescript
  /**
   * 工具调用状态
   */
  export type ToolInvocationState = 'call' | 'result';

  /**
   * 工具调用接口
   */
  export interface ToolInvocation {
    /** 工具调用唯一 ID */
    toolCallId: string;
    /** 工具名称 */
    toolName: string;
    /** 工具参数 */
    args: Record<string, any>;
    /** 调用状态 */
    state: ToolInvocationState;
    /** 工具返回结果（仅当 state === 'result' 时存在） */
    result?: any;
  }

  /**
   * 聊天消息接口（扩展 AI SDK 的 Message 类型）
   */
  export interface ChatMessage {
    /** 消息唯一 ID */
    id: string;
    /** 消息角色 */
    role: 'user' | 'assistant' | 'system';
    /** 消息内容 */
    content: string;
    /** 工具调用列表（仅 assistant 消息可能包含） */
    toolInvocations?: ToolInvocation[];
    /** 创建时间 */
    createdAt?: Date;
  }
  ```

### 2. 更新各文件使用统一类型
- [ ] 更新 `app/components/SettingsSidebar.tsx`：
  ```typescript
  import { LLMConfig } from '@/types/chat';

  // 删除文件内的 LLMConfig 定义
  // 使用导入的类型
  ```

- [ ] 更新 `app/components/ChatSidebar.tsx`：
  ```typescript
  import { LLMConfig, ToolInvocation } from '@/types/chat';

  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  ```

- [ ] 更新 `app/api/chat/route.ts`：
  ```typescript
  import { LLMConfig } from '@/types/chat';

  // 删除文件内的 LLMConfig 定义
  ```

### 3. 创建自定义 Hook
- [ ] 创建 `app/hooks/useLLMConfig.ts`：
  ```typescript
  import { useState, useEffect } from 'react';
  import { LLMConfig } from '@/types/chat';

  const STORAGE_KEY = 'llmConfig';

  /**
   * 自定义 Hook：管理 LLM 配置的加载和保存
   */
  export function useLLMConfig() {
    const [config, setConfig] = useState<LLMConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 加载配置
    useEffect(() => {
      try {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);

            // 迁移旧配置格式（useLegacyOpenAIFormat → providerType）
            if ('useLegacyOpenAIFormat' in parsed) {
              parsed.providerType = parsed.useLegacyOpenAIFormat
                ? 'openai'           // 旧式 = openai .chat
                : 'openai-response'; // 新式 = openai .responses
              delete parsed.useLegacyOpenAIFormat;
              // 自动保存迁移后的配置
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
              console.log('已自动迁移旧配置格式到新格式');
            }

            setConfig(parsed);
          }
        }
      } catch (e) {
        console.error('加载 LLM 配置失败:', e);
        setError('加载配置失败');
      } finally {
        setIsLoading(false);
      }
    }, []);

    // 保存配置
    const saveConfig = (newConfig: LLMConfig) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
        setConfig(newConfig);
        setError(null);
      } catch (e) {
        console.error('保存 LLM 配置失败:', e);
        setError('保存配置失败');
        throw e;
      }
    };

    return { config, isLoading, error, saveConfig };
  }
  ```

- [ ] 在 `ChatSidebar.tsx` 中使用自定义 Hook：
  ```typescript
  import { useLLMConfig } from '@/hooks/useLLMConfig';

  export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
    const { config: llmConfig, isLoading: configLoading } = useLLMConfig();

    // 删除原有的配置加载逻辑
  }
  ```

### 4. 添加开发环境日志
- [ ] 在 `app/api/chat/route.ts` 中添加调试日志：
  ```typescript
  // 仅在开发环境输出详细日志
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.log('[Chat API] 收到请求:', {
      messagesCount: messages.length,
      provider: llmConfig.useLegacyOpenAIFormat ? 'DeepSeek' : 'OpenAI',
      model: llmConfig.modelName,
      maxRounds: llmConfig.maxToolRounds,
    });
  }

  // 在 onStepFinish 中：
  onStepFinish: (step) => {
    if (isDev) {
      console.log('[Chat API] 步骤完成:', {
        stepType: step.stepType,
        toolCalls: step.toolCalls?.length || 0,
        textLength: step.text?.length || 0,
      });
    }
  },
  ```

### 5. 优化错误消息展示
- [ ] 在 `ChatSidebar.tsx` 中优化错误显示：
  ```typescript
  {error && (
    <div className="error-banner">
      <span className="error-icon">⚠️</span>
      <div className="error-content">
        <div className="error-title">发生错误</div>
        <div className="error-message">{error.message}</div>
        <button
          className="error-retry"
          onClick={() => window.location.reload()}
        >
          刷新页面
        </button>
      </div>
    </div>
  )}
  ```

- [ ] 添加对应样式（在 globals.css）：
  ```css
  .error-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .error-title {
    font-weight: 600;
    color: #dc2626;
  }

  .error-retry {
    align-self: flex-start;
    margin-top: 8px;
    padding: 4px 12px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .error-retry:hover {
    background: #dc2626;
  }
  ```

### 6. 更新文档
- [ ] 更新 `AGENTS.md`：
  ```markdown
  ### 2025-10-27 - AI Agent Loop 实现
  - ✅ 新增 Agent Loop 功能，支持自动工具调用循环
  - ✅ 集成 DrawIO 工具集为 AI function calls
  - ✅ 支持 DeepSeek 和 OpenAI 兼容的 API
  - ✅ 新增最大循环次数配置（防止无限循环）
  - ✅ 聊天界面展示工具调用过程
  ```

- [ ] 在 `app/lib/AGENTS.md` 中添加工具说明：
  ```markdown
  ## DrawIO AI 工具集 (drawio-ai-tools.ts)

  将 DrawIO XML 工具封装为 AI SDK 兼容的 function tools。

  ### 工具列表
  1. **get_drawio_xml**: 获取当前图表 XML
  2. **replace_drawio_xml**: 完全替换图表 XML
  3. **batch_replace_drawio_xml**: 批量精准替换 XML 片段
  ```

## 验收标准
- [ ] 所有文件使用统一的类型定义
- [ ] 无 TypeScript 编译错误或警告
- [ ] 自定义 Hook 正常工作
- [ ] 开发环境日志清晰有用
- [ ] 错误消息展示友好
- [ ] 文档更新完整准确

## 测试步骤
1. 运行 TypeScript 编译检查：
   ```bash
   npx tsc --noEmit
   ```
2. 确认无类型错误
3. 测试配置加载（使用新的 Hook）
4. 触发错误场景，检查错误显示
5. 查看浏览器控制台，确认日志格式
6. 阅读更新后的文档

## 注意事项
- **类型导出**：确保所有类型从 `@/types/chat` 导出
- **Hook 命名**：使用 `use` 前缀
- **日志级别**：仅在开发环境输出详细日志
- **错误处理**：提供用户友好的错误信息
- **文档格式**：保持与现有文档风格一致

---

**下一步**：完成后继续 [里程碑 6：集成测试与调试](./milestone-6.md)

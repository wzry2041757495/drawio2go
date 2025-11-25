# Milestone 1: 类型定义与存储基础

## 目标

建立新的LLM配置系统的类型基础和存储键结构，为后续开发奠定坚实的架构基础。

## 优先级

🔴 **最高优先级** - 所有后续里程碑都依赖此里程碑

## 任务列表

### 1. 更新类型定义文件

**文件**: `app/types/chat.ts`

- [ ] 保留现有的 `ProviderType` 枚举定义
- [ ] **删除**旧的 `LLMConfig` 接口（破坏性更改）
- [ ] 新增 `ProviderConfig` 接口（供应商配置）
  - 包含字段：id, displayName, providerType, apiUrl, apiKey, models, createdAt, updatedAt
- [ ] 新增 `ModelConfig` 接口（单个模型配置）
  - 包含字段：id, providerId, modelName, displayName, temperature, maxToolRounds, isDefault, createdAt, updatedAt
- [ ] 新增 `AgentSettings` 接口（全局Agent设置）
  - 包含字段：systemPrompt, updatedAt
- [ ] 新增 `ActiveModelReference` 接口（当前活动模型引用）
  - 包含字段：providerId, modelId, updatedAt
- [ ] 新增 `RuntimeLLMConfig` 接口（运行时合并配置）
  - 合并供应商、模型、Agent设置的所有字段

### 2. 更新配置工具文件

**文件**: `app/lib/config-utils.ts`

- [ ] 保留现有的 `DEFAULT_SYSTEM_PROMPT` 常量
- [ ] 保留现有的 `DEFAULT_API_URL` 常量
- [ ] **删除** `DEFAULT_LLM_CONFIG` 常量
- [ ] 新增 `DEFAULT_PROVIDERS` 常量数组
  - 包含默认的DeepSeek供应商
  - 包含2个默认模型：deepseek-chat 和 deepseek-reasoner
  - 每个模型设置temperature=0.3, maxToolRounds=5
  - deepseek-chat 标记为 isDefault
- [ ] 新增 `DEFAULT_AGENT_SETTINGS` 常量
  - 使用现有的 DEFAULT_SYSTEM_PROMPT
- [ ] 新增 `DEFAULT_ACTIVE_MODEL` 常量
  - 指向默认的 deepseek-chat 模型
- [ ] 新增 `initializeDefaultLLMConfig()` 函数
  - 检查存储中是否存在 `llm_providers` 键
  - 不存在则创建默认配置（供应商、模型、Agent设置、活动模型）
  - 使用 `generateUUID()` 生成所有ID
  - 可选：删除旧的 `llmConfig` 键
- [ ] **删除** `normalizeLLMConfig()` 函数（不再需要）

## 涉及文件

- 📝 修改：`app/types/chat.ts`
- 📝 修改：`app/lib/config-utils.ts`

## 验收标准

### TypeScript编译
- [ ] 运行 `pnpm tsc --noEmit` 无类型错误
- [ ] 所有新类型定义完整且正确

### 类型完整性
- [ ] `ProviderConfig` 包含所有必需字段和正确的类型
- [ ] `ModelConfig` 正确关联到 `providerId`
- [ ] `RuntimeLLMConfig` 正确合并所有配置字段
- [ ] 所有时间戳字段使用 `number` 类型

### 默认配置
- [ ] `DEFAULT_PROVIDERS` 包含完整的DeepSeek供应商配置
- [ ] 所有默认模型都有正确的初始参数
- [ ] `initializeDefaultLLMConfig()` 函数逻辑清晰

## 依赖关系

**前置依赖**: 无

**后续依赖**:
- Milestone 2（存储层方法）依赖此里程碑的类型定义
- Milestone 3-7（所有UI和API）依赖此里程碑的类型定义

## 注意事项

1. **破坏性更改**: 旧的 `LLMConfig` 接口将被删除，这是预期的破坏性更改
2. **UUID生成**: 使用项目现有的 `generateUUID()` 函数（位于 `app/lib/utils.ts`）
3. **时间戳**: 统一使用 `Date.now()` 生成毫秒级时间戳
4. **存储键命名**: 使用下划线命名法（如 `llm_providers`），保持与项目现有风格一致

## 预计时间

⏱️ **3-4 小时**

# Milestone 7: API集成

## 目标

修改聊天API路由以使用新的分层配置结构，从存储层动态获取运行时配置，支持模型独立的参数和全局系统提示词。

## 优先级

🟡 **高优先级** - 后端集成

## 任务列表

### 1. 修改API路由请求参数

**文件**: `app/api/chat/route.ts`

- [ ] 修改请求参数解析
  - 从 `body.llmConfig` 改为 `body.providerId` 和 `body.modelId`
  - 验证必需参数存在
- [ ] 添加参数验证
  - providerId不能为空
  - modelId不能为空
  - 返回400错误（缺少参数时）

### 2. 实现运行时配置获取

**文件**: `app/api/chat/route.ts`

- [ ] 创建 `getRuntimeConfigFromStorage()` 辅助函数
  - 接收StorageAdapter、providerId、modelId参数
  - 从存储读取 `llm_providers` 键
  - 解析JSON为 `ProviderConfig[]`
  - 查找指定的供应商和模型
  - 从存储读取 `agent_settings` 键
  - 解析JSON为 `AgentSettings`
  - 合并为完整的 `RuntimeLLMConfig`
  - 任一数据不存在时返回null
- [ ] 在POST处理函数中调用获取运行时配置
  - 获取storage实例
  - 调用 `getRuntimeConfigFromStorage()`
  - 配置不存在时返回404错误

### 3. 使用运行时配置

**文件**: `app/api/chat/route.ts`

- [ ] 保持现有的provider选择逻辑
  - 根据 `runtimeConfig.providerType` 选择
  - openai-reasoning → 使用 `createOpenAI()`
  - 其他 → 使用 `createOpenAICompatible()`
- [ ] 修改 `streamText()` 参数
  - system: 使用 `runtimeConfig.systemPrompt`（全局系统提示词）
  - temperature: 使用 `runtimeConfig.temperature`（模型独立的温度）
  - stopWhen: 使用 `stepCountIs(runtimeConfig.maxToolRounds)`（模型独立的轮次）
  - 其他参数保持不变
- [ ] 更新开发模式日志（如有）
  - 记录provider、model、temperature、maxToolRounds等信息
  - 便于调试

### 4. 清理旧代码

**文件**: `app/api/chat/route.ts`

- [ ] 移除对 `normalizeLLMConfig()` 的调用
- [ ] 移除对 `LLMConfig` 类型的引用
- [ ] 更新import语句（移除不再使用的导入）

### 5. 更新ChatSidebar的API调用

**文件**: `app/components/ChatSidebar.tsx`

- [ ] 确认 `useChat` 的body参数已更新
  - body: `{ providerId, modelId }` 而不是 `{ llmConfig }`
- [ ] 验证发送消息时传递正确的参数

## 涉及文件

- 📝 修改：`app/api/chat/route.ts`
- 📝 修改：`app/components/ChatSidebar.tsx`（验证body参数）
- 📖 依赖：`app/lib/storage`（获取storage实例）
- 📖 依赖：`app/types/chat.ts`（使用RuntimeLLMConfig类型）

## 验收标准

### 请求处理
- [ ] API正确接收providerId和modelId参数
- [ ] 缺少参数时返回400错误和清晰的错误消息
- [ ] 模型不存在时返回404错误和清晰的错误消息

### 配置获取
- [ ] 正确从存储层读取供应商配置
- [ ] 正确从存储层读取Agent设置
- [ ] 正确合并为RuntimeLLMConfig
- [ ] 供应商或模型不存在时返回null

### API功能
- [ ] 使用新配置发送消息成功
- [ ] 模型独立的温度参数生效
- [ ] 模型独立的maxToolRounds参数生效
- [ ] 全局系统提示词生效
- [ ] 不同providerType的provider选择正确

### 工具调用
- [ ] DrawIO工具调用正常
- [ ] 工具调用轮次限制正确（达到maxToolRounds时停止）
- [ ] 999轮次时接近无限制（实际测试可能达到的轮次）

### 错误处理
- [ ] 存储读取失败时有适当的错误处理
- [ ] JSON解析失败时有适当的错误处理
- [ ] 返回给前端的错误消息清晰有用

### 开发体验
- [ ] 开发模式日志输出有用的调试信息
- [ ] 日志包含provider、model、temperature、maxToolRounds等关键信息

## 依赖关系

**前置依赖**:
- ✅ Milestone 1（类型定义）
- ✅ Milestone 2（存储层方法）
- ✅ Milestone 6（ChatSidebar传递正确的参数）

**后续依赖**:
- Milestone 8（测试）将验证API集成的正确性

## 注意事项

1. **存储实例获取**: 在API路由中使用 `getStorage()` 获取存储适配器实例
2. **JSON解析**: 注意处理JSON解析错误，避免服务器崩溃
3. **类型安全**: 使用TypeScript类型确保配置字段正确
4. **错误消息**: 返回给前端的错误消息要清晰，帮助用户理解问题
5. **向后不兼容**: 这是破坏性更改，旧的llmConfig格式将不再被接受
6. **开发日志**: 保留或增强开发模式日志，便于调试新的配置流程
7. **性能**: 每次请求都要读取存储，确保存储操作足够快（通常<100ms）

## 测试要点

### 单元测试（手动）
- [ ] 测试不同供应商类型（openai-compatible, deepseek, openai-reasoning）
- [ ] 测试不同温度参数（0, 0.5, 1, 2）
- [ ] 测试不同maxToolRounds（5, 10, 30, 999）
- [ ] 测试供应商不存在的情况
- [ ] 测试模型不存在的情况
- [ ] 测试Agent设置不存在的情况（应使用默认值）

### 集成测试（手动）
- [ ] 完整流程：选择模型 → 发送消息 → 收到响应
- [ ] 切换模型 → 发送消息 → 验证使用新模型的参数
- [ ] 修改Agent设置 → 发送消息 → 验证使用新的系统提示词
- [ ] 修改模型参数 → 发送消息 → 验证使用新参数

## 预计时间

⏱️ **2-3 小时**

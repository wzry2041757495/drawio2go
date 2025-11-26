# Milestone 2: 存储层方法实现

## 目标

在 `useStorageSettings` Hook中实现完整的供应商、模型、Agent设置和活动模型的CRUD操作方法，确保数据持久化的可靠性和一致性。

## 优先级

🔴 **最高优先级** - UI和API都依赖存储层

## 任务列表

### 1. 供应商管理方法

**文件**: `app/hooks/useStorageSettings.ts`

- [ ] 实现 `getProviders()` 方法
  - 从存储读取 `llm_providers` 键
  - 解析JSON为 `ProviderConfig[]`
  - 不存在时调用 `initializeDefaultLLMConfig()`
  - 使用 `runStorageTask` 包装（8秒超时）

- [ ] 实现 `saveProviders()` 方法
  - 接收 `ProviderConfig[]` 参数
  - 序列化为JSON并写入 `llm_providers` 键
  - 使用 `runStorageTask` 包装

- [ ] 实现 `addProvider()` 方法
  - 接收供应商信息（不包含id和时间戳）
  - 生成UUID作为id
  - 设置 createdAt 和 updatedAt
  - 添加到现有供应商列表
  - 调用 `saveProviders()` 持久化
  - 返回完整的 `ProviderConfig`

- [ ] 实现 `updateProvider()` 方法
  - 接收providerId和部分更新数据
  - 查找并更新对应供应商
  - 更新 updatedAt 时间戳
  - 调用 `saveProviders()` 持久化

- [ ] 实现 `deleteProvider()` 方法
  - 接收providerId
  - 检查是否为当前活动模型的供应商
  - 如果是，先切换活动模型到其他供应商
  - 从列表中移除该供应商
  - 调用 `saveProviders()` 持久化

### 2. 模型管理方法

**文件**: `app/hooks/useStorageSettings.ts`

- [ ] 实现 `addModel()` 方法
  - 接收providerId和模型信息
  - 生成UUID作为modelId
  - 设置 createdAt 和 updatedAt
  - 添加到对应供应商的models数组
  - 调用 `saveProviders()` 持久化
  - 返回完整的 `ModelConfig`

- [ ] 实现 `updateModel()` 方法
  - 接收providerId、modelId和部分更新数据
  - 查找并更新对应模型
  - 更新 updatedAt 时间戳
  - 调用 `saveProviders()` 持久化

- [ ] 实现 `deleteModel()` 方法
  - 接收providerId和modelId
  - 检查是否为当前活动模型
  - 如果是，先切换活动模型到同供应商的其他模型
  - 从供应商的models数组中移除
  - 调用 `saveProviders()` 持久化

### 3. Agent设置方法

**文件**: `app/hooks/useStorageSettings.ts`

- [ ] 实现 `getAgentSettings()` 方法
  - 从存储读取 `agent_settings` 键
  - 解析JSON为 `AgentSettings`
  - 不存在时返回默认的 `DEFAULT_AGENT_SETTINGS`
  - 使用 `runStorageTask` 包装

- [ ] 实现 `saveAgentSettings()` 方法
  - 接收部分AgentSettings更新
  - 合并现有设置
  - 更新 updatedAt 时间戳
  - 序列化为JSON并写入 `agent_settings` 键
  - 使用 `runStorageTask` 包装

### 4. 活动模型管理方法

**文件**: `app/hooks/useStorageSettings.ts`

- [ ] 实现 `getActiveModel()` 方法
  - 从存储读取 `llm_active_model` 键
  - 解析JSON为 `ActiveModelReference`
  - 不存在时返回null
  - 使用 `runStorageTask` 包装

- [ ] 实现 `setActiveModel()` 方法
  - 接收providerId和modelId
  - 验证供应商和模型是否存在
  - 创建或更新 `ActiveModelReference`
  - 设置 updatedAt 时间戳
  - 序列化为JSON并写入 `llm_active_model` 键
  - 使用 `runStorageTask` 包装

### 5. 运行时配置获取方法

**文件**: `app/hooks/useStorageSettings.ts`

- [ ] 实现 `getRuntimeConfig()` 方法
  - 获取当前活动模型引用
  - 获取对应的供应商和模型配置
  - 获取Agent设置
  - 合并为完整的 `RuntimeLLMConfig`
  - 任一数据不存在时返回null
  - 使用 `runStorageTask` 包装

### 6. 清理旧配置（可选）

**文件**: `app/hooks/useStorageSettings.ts`

- [ ] **删除** `getLLMConfig()` 方法
- [ ] **删除** `saveLLMConfig()` 方法
- [ ] 在 `initializeDefaultLLMConfig()` 中可选删除旧的 `llmConfig` 键

## 涉及文件

- 📝 修改：`app/hooks/useStorageSettings.ts`
- 📖 依赖：`app/lib/config-utils.ts`（使用初始化函数）
- 📖 依赖：`app/lib/utils.ts`（使用UUID生成和runStorageTask）

## 验收标准

### 方法完整性

- [ ] 所有供应商CRUD方法实现完整
- [ ] 所有模型CRUD方法实现完整
- [ ] Agent设置读写方法实现完整
- [ ] 活动模型管理方法实现完整
- [ ] 运行时配置合并方法实现完整

### 数据一致性

- [ ] 删除供应商时正确处理级联（活动模型切换）
- [ ] 删除模型时正确处理级联（活动模型切换）
- [ ] 所有写操作都更新时间戳
- [ ] 所有UUID使用 `generateUUID()` 生成

### 错误处理

- [ ] 所有存储操作使用 `runStorageTask` 包装
- [ ] 超时设置为8秒（与项目现有策略一致）
- [ ] 方法内部有适当的错误日志

### TypeScript类型

- [ ] 所有方法有完整的类型签名
- [ ] 返回类型正确（Promise包装）
- [ ] 参数类型使用正确的接口

### 初始化测试

- [ ] 首次调用 `getProviders()` 时自动创建默认配置
- [ ] 默认配置包含DeepSeek供应商和2个模型
- [ ] 默认活动模型指向 deepseek-chat

## 依赖关系

**前置依赖**:

- ✅ Milestone 1（类型定义）必须完成

**后续依赖**:

- Milestone 3-6（所有UI）依赖这些存储方法
- Milestone 7（API集成）依赖 `getRuntimeConfig()` 方法

## 注意事项

1. **级联删除**: 删除供应商/模型时，必须检查并处理活动模型引用
2. **原子性**: 所有写操作应该是原子的，避免部分更新
3. **时间戳**: 每次更新都要更新 `updatedAt` 字段
4. **JSON序列化**: 确保所有日期、undefined等特殊值正确处理
5. **存储适配器**: 代码应该兼容SQLite和IndexedDB两种存储

## 预计时间

⏱️ **3-4 小时**

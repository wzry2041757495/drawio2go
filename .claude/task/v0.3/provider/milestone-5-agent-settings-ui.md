# Milestone 5: Agent设置UI

## 目标

创建独立的Agent设置面板，将系统提示词从LLM配置中分离出来，提供全局的AI助手行为配置界面。

## 优先级

🟡 **高优先级** - 核心UI功能

## 任务列表

### 1. 创建Agent设置面板

**文件**: `app/components/settings/AgentSettingsPanel.tsx`（新建）

- [ ] 使用 `"use client"` 指令
- [ ] 实现面板基本结构
  - 标题：Agent 设置
  - 描述：配置 AI 助手的全局行为
- [ ] 实现系统提示词编辑区域
  - 使用 `TextField` + `TextArea` 组件
  - Label: "系统提示词"
  - Description: "定义 AI 助手的行为规则和工作模式，对所有模型生效"
  - rows={15} - 提供足够的编辑空间
- [ ] 从存储层加载Agent设置
  - 使用 `useStorageSettings.getAgentSettings()`
  - 初始化时加载现有的系统提示词
  - 不存在时使用 `DEFAULT_SYSTEM_PROMPT`
- [ ] 实现"恢复默认提示词"按钮
  - 使用 `Button` 组件，variant="secondary", size="sm"
  - 点击时将系统提示词重置为 `DEFAULT_SYSTEM_PROMPT`
  - 显示确认对话框（避免误操作）
- [ ] 实现保存逻辑
  - 与其他设置面板集成（在SettingsSidebar的统一保存按钮中）
  - 调用 `useStorageSettings.saveAgentSettings()`
  - 显示保存成功反馈
- [ ] 实现变更检测
  - 跟踪系统提示词是否被修改
  - 与SettingsSidebar的 `hasChanges` 状态集成
  - 未保存时切换tab提示用户

### 2. 集成到设置侧边栏

**文件**: `app/components/SettingsSidebar.tsx`

- [ ] 在tab切换逻辑中添加 `agent` case
- [ ] 渲染 `AgentSettingsPanel` 组件
- [ ] 集成Agent设置的变更检测
  - 加载Agent设置到本地状态
  - 跟踪变更并更新 `hasChanges`
- [ ] 在保存按钮处理中添加Agent设置保存
  - 调用 `saveAgentSettings()`
  - 更新已保存状态
- [ ] 在取消按钮处理中添加Agent设置重置
  - 恢复到上次保存的状态

### 3. 删除旧组件

- [ ] **删除** `app/components/settings/SystemPromptEditor.tsx`
  - 功能已完全合并到AgentSettingsPanel

## 涉及文件

- ✨ 新建：`app/components/settings/AgentSettingsPanel.tsx`
- 📝 修改：`app/components/SettingsSidebar.tsx`
- 🗑️ 删除：`app/components/settings/SystemPromptEditor.tsx`
- 📖 依赖：`app/hooks/useStorageSettings.ts`（使用存储方法）
- 📖 依赖：`app/lib/config-utils.ts`（使用DEFAULT_SYSTEM_PROMPT）

## HeroUI v3 组件使用

### 必须遵循的规范

- ✅ 使用复合组件模式
- ✅ 使用语义化variant
- ✅ 使用 `onPress` 而不是 `onClick`

### 使用的组件

- `TextField` + `Label` + `TextArea` + `Description`
- `Button`（variant: secondary）
- 可选：`AlertDialog`（用于恢复默认提示词的确认对话框）

## 验收标准

### UI显示

- [ ] Agent设置面板正确渲染
- [ ] 系统提示词TextArea显示正确
- [ ] TextArea有足够的高度（15行）便于编辑
- [ ] "恢复默认提示词"按钮位置合理

### 数据操作

- [ ] 初始化时正确加载现有的系统提示词
- [ ] 不存在时使用默认系统提示词
- [ ] 编辑系统提示词后能正确保存
- [ ] 恢复默认提示词功能正常
- [ ] 恢复默认时显示确认对话框

### 变更检测

- [ ] 编辑系统提示词后 `hasChanges` 正确更新
- [ ] 保存后 `hasChanges` 重置
- [ ] 取消后恢复到上次保存状态
- [ ] 未保存时切换tab显示提示

### HeroUI规范

- [ ] TextField使用复合组件模式
- [ ] Button使用语义化variant
- [ ] 深色/浅色主题适配正常

### 集成测试

- [ ] 与SettingsSidebar的保存/取消逻辑正确集成
- [ ] 与其他设置tab的变更检测协同工作
- [ ] 保存成功后显示反馈

## 依赖关系

**前置依赖**:

- ✅ Milestone 1（类型定义）
- ✅ Milestone 2（存储层方法，特别是getAgentSettings和saveAgentSettings）
- ✅ Milestone 3（设置导航和tab结构）

**后续依赖**:

- Milestone 7（API集成）将使用Agent设置中的系统提示词

## 注意事项

1. **TextArea高度**: 设置足够的rows（15行），让用户可以看到更多内容，减少滚动
2. **确认对话框**: 恢复默认提示词是破坏性操作，必须有确认对话框
3. **全局生效**: 在UI上明确说明系统提示词对所有模型生效，不是单个模型的配置
4. **保存反馈**: 保存成功后给予明确的反馈（Toast或Alert）
5. **空白处理**: 不允许保存空白的系统提示词，至少要有一些内容
6. **变更检测**: 使用准确的字符串比较检测变更，避免误判

## 预计时间

⏱️ **2-3 小时**

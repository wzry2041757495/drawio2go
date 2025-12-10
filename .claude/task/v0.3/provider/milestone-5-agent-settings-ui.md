# Milestone 5: Agent 设置 UI ✅

## 完成状态

**已完成** - 2025-12-04 (与 Milestone 4 同批次提交)

## 实现概述

创建独立的 Agent 设置面板，采用内联编辑模式替代弹窗模式，提供全局系统提示词配置，并导出校验辅助函数供父组件使用。

## 核心功能

### 1. AgentSettingsPanel 组件重构

**文件**: `app/components/settings/AgentSettingsPanel.tsx`

内联编辑模式，接口和功能如下：

- **Props 接口**：
  - `systemPrompt: string` - 当前系统提示词
  - `onChange: (systemPrompt: string) => void` - 变更回调（无副作用，由父组件管理时间戳）
  - `error?: string` - 可选错误信息（由父组件传入）

- **UI 布局**：
  - 使用 TextField + TextArea 直接编辑（rows=15, min-h-15rem, max-h-60vh）
  - Label + Description 说明提示词作用
  - "恢复默认"按钮（RotateCcw 图标，位于右上角）

- **ConfirmDialog 集成**：
  - 点击"恢复默认"触发 danger variant 确认对话框
  - 确认后调用 `onChange(DEFAULT_SYSTEM_PROMPT)`
  - 使用 react-i18next 的 `useTranslation("settings")` 并提供中文 fallback

- **校验辅助**：
  - 导出 `isSystemPromptValid(value: string): boolean` - 检查非空白
  - 导出 `getSystemPromptError(value: string): string | null` - 获取错误信息
  - 组件内部 useMemo 计算 derivedError，优先使用 props.error

- **FieldError 显示**：
  - 空白时显示 FieldError 组件（红色错误提示）

### 2. SettingsSidebar 集成

**文件**: `app/components/SettingsSidebar.tsx`

集成要点：

- **状态管理**：
  - 使用 `useMemo` 计算 `systemPromptError`
  - 传入 `systemPrompt` 和 `onChange` 而非整个 `agentSettings` 对象
  - onChange 回调中更新 `agentSettings.systemPrompt` 和 `updatedAt`

- **保存前校验**：
  - 在 `handleSave` 开头调用 `isSystemPromptValid`
  - 校验失败时显示 Toast（danger variant）并切换到 agent tab
  - 校验通过后继续保存流程

- **变更检测**：
  - 继续使用现有的 `hasChanges` 逻辑（比较 agentSettings）

### 3. 旧组件移除

- ✅ **删除** `app/components/settings/SystemPromptEditor.tsx`
  - 原弹窗编辑模式已被内联编辑完全替代

### 4. 文档和国际化

- **AGENTS.md 更新**：
  - 移除 SystemPromptEditor 描述
  - 更新 AgentSettingsPanel 接口文档
  - 添加校验辅助函数说明
  - 更新使用示例代码

- **国际化文件**（`public/locales/{en-US,zh-CN}/settings.json`）：
  - `agent.systemPrompt.reset` - "恢复默认"
  - `agent.systemPrompt.errorEmpty` - "系统提示词不能为空"
  - `agent.systemPrompt.resetTitle` - "恢复默认系统提示词"
  - `agent.systemPrompt.resetConfirm` - 确认提示文案

## 涉及文件

- ✅ 新建：`app/components/settings/AgentSettingsPanel.tsx`
- ✅ 修改：`app/components/SettingsSidebar.tsx`
- ✅ 修改：`app/components/settings/index.ts`（导出校验辅助函数）
- ✅ 删除：`app/components/settings/SystemPromptEditor.tsx`
- ✅ 修改：`app/components/settings/AGENTS.md`
- ✅ 修改：`public/locales/en-US/settings.json`
- ✅ 修改：`public/locales/zh-CN/settings.json`
- 📖 依赖：`app/components/common/ConfirmDialog.tsx`（来自 Milestone 4）
- 📖 依赖：`app/lib/config-utils.ts`（使用 DEFAULT_SYSTEM_PROMPT）

## HeroUI v3 组件使用

### 遵循的规范

- ✅ 使用复合组件模式（TextField + Label + TextArea + Description + FieldError）
- ✅ 使用语义化 variant（Button 使用 secondary，ConfirmDialog 使用 danger）
- ✅ 使用 `onPress` 替代 `onClick`
- ✅ 使用 `onChange={(event) => ...}` 处理输入变更

### 使用的组件

- `TextField` + `Label` + `TextArea` + `Description` + `FieldError`
- `Button`（variant: secondary, size: sm）
- `ConfirmDialog`（variant: danger，复用 Milestone 4 组件）
- lucide-react 图标（RotateCcw）

## 关键实现细节

1. **无副作用设计**：组件不直接操作存储，只接收 `systemPrompt` 和 `onChange`，由父组件负责持久化和时间戳管理

2. **校验辅助导出**：导出 `isSystemPromptValid` 和 `getSystemPromptError`，供父组件在保存前校验使用

3. **错误优先级**：优先使用 props.error（父组件传入），其次使用内部校验结果

4. **ConfirmDialog 复用**：直接复用 Milestone 4 创建的通用确认对话框组件，variant="danger" 强调破坏性操作

5. **国际化 fallback**：使用 `useTranslation("settings")` 并为所有文案提供中文 fallback 值

6. **响应式高度**：TextArea 设置 `rows={15}, min-h-[15rem], max-h-[60vh]`，适配不同屏幕尺寸

7. **SettingsSidebar 保存拦截**：在 handleSave 开头校验，失败时阻止保存并自动切换到 agent tab

## 依赖关系

**前置依赖**：

- ✅ Milestone 1：类型定义（AgentSettings）
- ✅ Milestone 2：存储层方法（getAgentSettings / saveAgentSettings）
- ✅ Milestone 3：设置导航和 tab 结构（SettingsSidebar）
- ✅ Milestone 4：ConfirmDialog 通用组件

**后续影响**：

- Milestone 7（API 集成）将使用 Agent 设置中的系统提示词

## 验收标准（已完成）

### UI 显示 ✅

- ✅ Agent 设置面板正确渲染，内联编辑模式
- ✅ TextArea 高度 15 行，便于查看和编辑
- ✅ "恢复默认"按钮位于右上角，带 RotateCcw 图标
- ✅ Label + Description 清晰说明作用域（全局生效）

### 数据操作 ✅

- ✅ 初始化时正确加载现有的系统提示词
- ✅ 编辑系统提示词实时更新状态
- ✅ 恢复默认功能触发 ConfirmDialog（danger variant）
- ✅ 确认后立即恢复 DEFAULT_SYSTEM_PROMPT

### 校验 ✅

- ✅ 空白提示词显示 FieldError（红色错误提示）
- ✅ 保存前在 SettingsSidebar 校验，失败时阻止保存并切换到 agent tab
- ✅ 显示 Toast 反馈校验失败原因

### HeroUI 规范 ✅

- ✅ TextField 复合组件模式（Label + TextArea + Description + FieldError）
- ✅ Button 使用语义化 variant="secondary"
- ✅ ConfirmDialog 使用 variant="danger"
- ✅ 深色/浅色主题适配正常

### 集成测试 ✅

- ✅ 与 SettingsSidebar 的保存/取消逻辑正确集成
- ✅ 与其他设置 tab 的变更检测协同工作
- ✅ 保存成功后显示 Toast 反馈

## 设计要点

1. **内联编辑优于弹窗**：避免增加交互层级，提升编辑效率
2. **校验辅助函数导出**：避免重复逻辑，由父组件统一在保存前校验
3. **错误信息可控**：支持父组件传入 error prop，也支持内部推导
4. **破坏性操作确认**：恢复默认使用 danger variant ConfirmDialog
5. **国际化完整性**：所有文案提供 fallback，确保中英文环境均可用

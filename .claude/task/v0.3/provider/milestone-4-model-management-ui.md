# Milestone 4: 模型管理 UI ✅

## 完成状态

**已完成** - 154436c (2025-12-04)

## 实现概述

在供应商管理面板中实现完整的模型 CRUD 功能,包括模型列表展示、能力徽章、编辑对话框和通用确认对话框组件。

## 核心功能

### 1. ModelsSettingsPanel 扩展

**文件**: `app/components/settings/ModelsSettingsPanel.tsx`

- 在 Accordion.Content 中使用 Card 组件展示模型列表
- 模型卡片显示:名称、显示名称、温度、工具轮次、能力徽章、默认标记
- Popover 菜单提供编辑/设为默认/删除操作
- 能力徽章使用 Chip 组件:思考(Brain)、视觉(Eye)、工具(Wrench)
- 删除模型使用 ConfirmDialog 二次确认,自动处理活动模型切换
- 设置默认模型时自动清除同供应商下其他默认标记

### 2. ModelEditDialog 组件

**文件**: `app/components/settings/ModelEditDialog.tsx`

使用 ModalOverlay + Surface + AriaDialog 结构,表单包含:

- **基础字段**: 模型名称(必填)、显示名称(可选)、温度(0-2)、最大工具轮次(1-999)
- **能力配置**: Fieldset 包裹 Checkbox,支持思考能力、视觉能力配置
- **工具调用**: 条件显示 enableToolsInThinking 选项(仅当 supportsThinking 为 true)
- **表单验证**: 实时校验模型名称、数值范围,错误提示使用 FieldError
- **保存逻辑**: 调用 addModel/updateModel,支持异步保存并显示加载状态

### 3. ConfirmDialog 通用组件

**文件**: `app/components/common/ConfirmDialog.tsx`

统一的确认对话框组件,替代 window.confirm:

- 支持 variant="default" | "danger" 控制确认按钮样式
- isDismissable 允许遮罩点击和 ESC 关闭,触发取消回调
- 异步 onConfirm 支持加载态显示(Spinner)
- 按钮顺序:取消在左、确认在右
- 使用 closingReasonRef 避免遮罩关闭和取消按钮重复触发回调

## HeroUI v3 规范

### 组件使用

- **Card**: Header + Content 结构展示模型
- **Modal**: ModalOverlay + AriaModal + AriaDialog 复合模式
- **TextField**: Label + Input + Description + FieldError 完整表单结构
- **Fieldset**: Legend + Group 分组能力选项
- **Checkbox**: 包含 Label + Description 符合可访问性
- **Chip**: variant="secondary"(能力)、variant="tertiary"(工具)
- **Button**: onPress 事件、isDisabled 属性、语义化 variant
- **Popover**: 搭配 ListBox 实现操作菜单

### 事件规范

- 使用 `onPress` 替代 `onClick`
- 使用 `isDisabled` 替代 `disabled`
- 使用 `isSelected` 控制 Checkbox 状态

## 涉及文件

- ✅ 修改: `app/components/settings/ModelsSettingsPanel.tsx`
- ✅ 新建: `app/components/settings/ModelEditDialog.tsx`
- ✅ 新建: `app/components/common/ConfirmDialog.tsx`
- ✅ 新建: `app/components/common/AGENTS.md`
- ✅ 更新: `app/components/settings/AGENTS.md`

## 关键实现细节

1. **能力徽章**: 条件渲染 supportsThinking/supportsVision/enableToolsInThinking,使用 lucide-react 图标
2. **默认模型唯一性**: 设置默认时自动清除同供应商其他模型的 isDefault 标记
3. **级联删除**: 删除活动模型时自动切换到同供应商的其他模型
4. **表单初始化**: 编辑模式加载现有数据,新建模式使用 getDefaultCapabilities 推断能力
5. **关闭逻辑**: closingReasonRef 区分遮罩关闭和主动取消,避免重复回调
6. **Toast 反馈**: 所有操作完成后显示成功/失败提示
7. **响应式布局**: 使用 grid + sm:grid-cols-2 实现移动端友好布局

## 依赖关系

- ✅ Milestone 1: 类型定义(ModelCapabilities)
- ✅ Milestone 2: 存储层方法(addModel/updateModel/deleteModel)
- ✅ Milestone 3: 供应商管理 UI(Accordion 结构)

## 后续影响

- Milestone 6 聊天页面模型选择器将读取此处管理的模型数据

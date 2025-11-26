# Milestone 6: 聊天页面模型选择器

## 目标

在聊天页面右下角实现模型快速切换选择器，使用HeroUI v3 Select组件，支持按供应商分组显示所有模型，并持久化选择。

## 优先级

🟡 **高优先级** - 核心用户体验功能

## 任务列表

### 1. 在ChatSidebar中添加状态管理

**文件**: `app/components/ChatSidebar.tsx`

- [ ] 添加模型相关状态
  - `currentProviderId`: 当前选中的供应商ID
  - `currentModelId`: 当前选中的模型ID
  - `providers`: 所有供应商配置列表
- [ ] 初始化时加载活动模型
  - 使用 `useStorageSettings.getActiveModel()`
  - 获取活动模型引用并设置状态
  - 使用 `useStorageSettings.getProviders()`
  - 加载所有供应商和模型列表
- [ ] 实现模型切换处理函数
  - 接收选择器的值（格式："providerId:modelId"）
  - 解析providerId和modelId
  - 更新本地状态
  - 调用 `setActiveModel(providerId, modelId)` 持久化
  - **不创建新会话**，继续当前会话
- [ ] 修改 `useChat` 的body参数
  - 从 `{ llmConfig }` 改为 `{ providerId, modelId }`
  - 确保每次发送消息时传递当前选中的模型引用

### 2. 创建模型选择器UI

**文件**: `app/components/ChatSidebar.tsx`（在现有文件中添加）

- [ ] 在聊天界面中添加模型选择器容器
  - 使用固定定位（position: fixed）
  - 位置：右下角（bottom: 24px, right: 24px）
  - z-index: 50（确保在其他元素上方）
- [ ] 使用HeroUI v3 `Select` 组件（复合组件模式）
- [ ] 实现选择器结构
  - `Label`: "当前模型"
  - `Select.Trigger`: 显示当前选中的模型信息
    - 模型图标（Cpu或类似）
    - 模型显示名称或模型名称
    - 供应商显示名称
    - 下拉指示器
  - `Select.Content`: 下拉选项列表
    - 使用 `ListBox.Section` 按供应商分组
    - 每个供应商为一个Section，显示供应商名称
    - Section内显示该供应商的所有模型
- [ ] 实现模型选项内容
  - 模型名称（displayName 或 modelName）
  - 默认模型显示Badge标记
  - 显示模型参数（温度、工具轮次）
  - 选中指示器（ListBox.ItemIndicator）
- [ ] 实现选择器交互
  - 点击Trigger打开/关闭下拉列表
  - 选择模型后关闭下拉列表
  - 调用模型切换处理函数

### 3. 创建模型选择器样式

**文件**: `app/styles/components/model-selector.css`（新建）

- [ ] 实现选择器容器样式
  - 固定定位在右下角
  - 最小宽度：280px
  - z-index: 50
- [ ] 实现Trigger样式
  - 使用玻璃形态效果（backdrop-filter: blur(12px)）
  - 背景：var(--surface-glass)
  - 边框：var(--border-default)
  - 圆角：var(--radius-lg)（12px）
  - 阴影：var(--shadow-3)
  - hover时增强边框和阴影
- [ ] 实现下拉列表样式
  - 最大高度：400px
  - 溢出时显示滚动条
- [ ] 实现模型选项样式
  - 模型名称样式
  - 参数显示样式（小字、次要颜色）
  - 分组标题样式
- [ ] 响应式适配
  - 小屏幕时调整位置或宽度（如需要）

### 4. 导入样式

**文件**: `app/globals.css`

- [ ] 导入新的模型选择器样式
  - 添加 `@import './components/model-selector.css';`

## 涉及文件

- 📝 修改：`app/components/ChatSidebar.tsx`
- ✨ 新建：`app/styles/components/model-selector.css`
- 📝 修改：`app/globals.css`
- 📖 依赖：`app/hooks/useStorageSettings.ts`（使用存储方法）

## HeroUI v3 组件使用

### 必须遵循的规范

- ✅ 使用复合组件模式
- ✅ 使用语义化variant
- ✅ 使用 `onPress` 而不是 `onClick`

### 使用的组件

- `Select` + `Select.Trigger` + `Select.Value` + `Select.Indicator` + `Select.Content`
- `ListBox` + `ListBox.Section` + `ListBox.Item` + `ListBox.ItemIndicator`
- `Label`
- `Badge`（显示"默认"标记）
- Lucide图标（如 `Cpu`）

## 验收标准

### UI显示

- [ ] 模型选择器固定在聊天页面右下角
- [ ] Trigger显示当前选中的模型和供应商
- [ ] Trigger有玻璃形态效果（毛玻璃背景）
- [ ] 点击Trigger正确打开/关闭下拉列表

### 下拉列表

- [ ] 模型按供应商分组显示
- [ ] 每个供应商作为一个Section，显示供应商名称
- [ ] 每个模型显示完整信息（名称、参数）
- [ ] 默认模型显示Badge标记
- [ ] 当前选中的模型有选中指示器
- [ ] 下拉列表滚动流畅

### 数据操作

- [ ] 初始化时正确加载活动模型
- [ ] 初始化时正确加载所有供应商和模型
- [ ] 切换模型后本地状态正确更新
- [ ] 切换模型后持久化到存储（setActiveModel）
- [ ] 切换模型后继续当前会话（不创建新会话）
- [ ] 下一条消息使用新选中的模型

### useChat集成

- [ ] useChat的body包含正确的providerId和modelId
- [ ] 切换模型后发送消息使用新模型
- [ ] 消息元数据记录正确的模型名称

### 样式

- [ ] 深色/浅色主题适配正常
- [ ] 玻璃形态效果在两种主题下都正常
- [ ] hover效果流畅
- [ ] 边框和阴影符合Material Design规范
- [ ] 圆角使用CSS变量（var(--radius-lg)）

### 可访问性

- [ ] 键盘可以操作选择器（Tab、Enter、Arrow）
- [ ] 屏幕阅读器可以读取选择器内容
- [ ] Label正确关联到Select

## 依赖关系

**前置依赖**:

- ✅ Milestone 1（类型定义）
- ✅ Milestone 2（存储层方法，特别是getActiveModel、setActiveModel、getProviders）
- ✅ Milestone 3-4（供应商和模型数据存在）

**后续依赖**:

- Milestone 7（API集成）将使用模型引用而不是完整配置

## 注意事项

1. **Select复合组件**: HeroUI v3的Select必须使用复合组件模式，包含Trigger、Content等子组件
2. **ListBox.Section**: 使用Section实现分组，每个供应商一个Section
3. **固定定位**: 使用fixed定位确保选择器在聊天内容滚动时保持在右下角
4. **玻璃形态**: 使用backdrop-filter实现毛玻璃效果，注意浏览器兼容性
5. **会话连续性**: 切换模型后不创建新会话，用户可以在同一会话中使用不同模型
6. **值格式**: Select的value使用 "providerId:modelId" 格式，方便解析
7. **无模型处理**: 如果没有任何供应商或模型，显示友好的空状态提示

## 预计时间

⏱️ **3-4 小时**

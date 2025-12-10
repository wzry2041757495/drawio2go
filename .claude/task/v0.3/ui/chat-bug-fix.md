# 重构聊天页面

## 概述

本计划涉及四个主要改进方向：

1. **布局重构**：删除ChatSessionHeader，将模型选择器移到独立一行
2. **聊天逻辑优化**：禁止连续用户消息、添加重试功能、自动会话管理
3. **取消机制修复**：实现AbortController，修复后台继续运行的Bug
4. **历史页面优化**：使用HeroUI v3原生组件，优化响应式布局

## 实施步骤

### Phase 1: 布局重构 (优先级: 高)

#### 目标布局转换

**当前布局**:

```
ChatSidebar
├── ChatSessionHeader (会话头部) ← 删除
├── MessageList
└── ChatInputArea
    └── ChatInputActions
        ├── ModelComboBox ← 移走
        ├── 新建/历史按钮
        └── 发送/停止按钮
```

**目标布局**:

```
ChatSidebar
├── MessageList ← 顶部无会话头部
├── ModelSelectorBar (新增) ← 独立一行
│   └── ModelComboBox
└── ChatInputArea
    └── ChatInputActions
        ├── 新建/历史按钮 ← 保留
        └── 发送/停止按钮
```

#### 1.1 创建新组件 ModelSelectorBar

**新建文件**: `app/components/chat/ModelSelectorBar.tsx`

- 简单的包装组件，将模型选择器独立显示
- 接收 modelSelector (ReactNode) 和 disabled props

**新建样式**: `app/styles/components/model-selector-bar.css`

- 使用 flexbox 布局
- 添加上下边框分隔
- 最小高度 3rem

#### 1.2 修改 ChatSidebar 主组件

**修改文件**: `app/components/ChatSidebar.tsx`

**关键改动**：

- 删除导入 ChatSessionHeader (line 38)
- 添加导入 ModelSelectorBar
- 删除相关函数 (lines 886-982)：
  - handleDeleteSession
  - handleExportSession
  - handleExportAllSessions
- 修改渲染结构 (lines 1203-1264)：
  - MessageList 移到顶部（无会话头部）
  - 添加 ModelSelectorBar 在中间
  - ChatInputArea 在底部（移除 modelSelector prop）

#### 1.3 修改输入组件

**修改文件**: `app/components/chat/ChatInputActions.tsx`

- 移除 modelSelector prop (lines 18, 27, 45)

**修改文件**: `app/components/chat/ChatInputArea.tsx`

- 移除 modelSelector prop (lines 19, 32, 77)

#### 1.4 更新样式

**修改文件**: `app/styles/components/chat.css`

- messages-scroll-area: 顶部增加 padding
- chat-input-area: 移除顶部边框

---

### Phase 2: 聊天逻辑优化 (优先级: 高)

#### 2.1 禁止连续用户消息 + 重试功能

**修改文件**: `app/components/ChatSidebar.tsx`

**添加派生状态**：

- `lastMessageIsUser`: 检测最后一条消息是否为用户消息
- `canSendNewMessage`: 判断是否允许发送新消息
  - 流式时允许（显示取消按钮）
  - 禁止连续用户消息

**添加重试函数 handleRetry**：

- 检查最后一条消息是用户消息
- 提取文本并恢复到输入框
- 删除最后一条未回复的消息
- 显示提示信息

**传递新props到子组件**：

- ChatInputArea: 添加 canSendNewMessage 和 onRetry
- ChatInputActions: 添加 canSendNewMessage, lastMessageIsUser, onRetry

#### 2.2 修改 ChatInputArea 和 ChatInputActions

**修改文件**: `app/components/chat/ChatInputArea.tsx`

- 添加 canSendNewMessage 和 onRetry props
- 发送禁用条件添加 !canSendNewMessage

**修改文件**: `app/components/chat/ChatInputActions.tsx`

- 添加重试按钮（仅在 lastMessageIsUser && !isChatStreaming 时显示）
- 添加等待提示（!canSendNewMessage && !isChatStreaming 时显示）
- 使用旋转箭头图标表示重试

**添加样式**：

- chat-waiting-hint: 黄色警告提示，带脉冲动画

#### 2.3 添加翻译

**修改文件**:

- `public/locales/zh-CN/chat.json`
- `public/locales/en-US/chat.json`

**新增翻译键**：

- input.retry: "重试上一条消息"
- input.waitingForAI: "等待 AI 回复..."
- messages.retryTitle: "已准备重试"
- messages.retryDescription: "上一条消息已恢复到输入框"
- messages.userCancelled: "用户主动取消了此次对话"
- messages.connectionLost: "连接已断开"

---

### Phase 3: 修复取消Bug + 同步保存 (优先级: 中高)

#### 3.1 修改后端 API 支持 AbortController

**修改文件**: `app/api/chat/route.ts`

**在 POST 函数中添加**：

- 创建 AbortController 和 abortSignal
- 监听 req.signal 的 abort 事件
- 将 abortSignal 传递给 streamText()
- 捕获并处理 AbortError

**关键点**：

- req.signal.addEventListener("abort", ...)
- streamText({ ..., abortSignal })
- 错误处理中识别 AbortError

#### 3.2 添加错误码

**修改文件**: `app/errors/error-codes.ts`

- 添加 CHAT_REQUEST_CANCELLED: "CHAT_REQUEST_CANCELLED"

#### 3.3 扩展消息元数据类型

**修改文件**: `app/types/chat.ts`

- MessageMetadata 添加字段：
  - isCancelled?: boolean (用户主动取消)
  - isDisconnected?: boolean (连接断开)

#### 3.4 前端取消时添加标记并立即保存

**修改文件**: `app/components/ChatSidebar.tsx`

**修改 handleCancel 函数**：

- 调用 stop() 关闭 SSE
- 创建 cancelMessage（role: "system", metadata.isCancelled: true）
- 立即添加到消息列表
- 立即调用 chatService.saveNow() 保存
- 清理 sendingSessionIdRef

#### 3.5 添加页面卸载监听

**修改文件**: `app/components/ChatSidebar.tsx`

**添加 useEffect 监听**：

- handleBeforeUnload: 页面卸载时同步保存
  - 创建 disconnectMessage（metadata.isDisconnected: true）
  - 调用 chatService.saveNow() 保存
- handleVisibilityChange: Tab切换时仅记录日志，不触发保存

**注意**: beforeunload 中的异步操作可能不可靠，需要实际测试。

---

### Phase 4: 历史页面优化 (优先级: 中)

#### 4.1 重构 HistoryToolbar 使用 HeroUI

**修改文件**: `app/components/chat/HistoryToolbar.tsx`

**关键改进**：

- 搜索框使用 InputGroup 包装，左侧显示搜索图标
- 日期筛选使用 HeroUI Input[type="date"]
- 批量操作按钮使用 HeroUI Button 的不同 variants

#### 4.2 重构 ConversationList 使用 HeroUI Card

**修改文件**: `app/components/chat/ConversationList.tsx`

**使用 HeroUI Card 组件**：

- Card.Content 包含内容
- Checkbox 用于选择模式
- 会话元数据显示在 Card 内部
- Button 用于预览操作

#### 4.3 重构响应式样式

**修改文件**: `app/styles/components/history-view.css`

**关键改进**：

- 筛选栏使用 flexbox，flex-wrap: wrap
- 搜索框 flex: 1 1 300px，灵活宽度
- 日期筛选 flex: 0 1 auto，不增长可收缩

**窄屏优化 (max-width: 720px)**：

- 筛选栏改为 flex-direction: column
- 子元素 align-items: stretch
- 预览面板改为底部抽屉（position: fixed, inset: auto 0 0 0）
- 预览面板高度 60vh
- 使用 transform: translateY() 实现滑入滑出动画

---

## 关键文件清单

### 必须修改的文件 (Critical)

1. **`app/components/ChatSidebar.tsx`**
   - 删除 ChatSessionHeader
   - 集成 ModelSelectorBar
   - 添加聊天逻辑优化
   - 添加取消和卸载监听

2. **`app/api/chat/route.ts`**
   - 添加 AbortController 支持

3. **`app/components/chat/ChatInputActions.tsx`**
   - 移除模型选择器
   - 添加重试按钮和等待提示

4. **`app/components/chat/ChatInputArea.tsx`**
   - 移除模型选择器 prop
   - 添加 canSendNewMessage prop

5. **`app/types/chat.ts`**
   - 扩展 MessageMetadata 类型

### 需要新建的文件

1. **`app/components/chat/ModelSelectorBar.tsx`** - 模型选择器独立组件
2. **`app/styles/components/model-selector-bar.css`** - 模型选择器样式

### 需要更新的样式文件

1. **`app/styles/components/chat.css`** - 聊天样式
2. **`app/styles/components/history-view.css`** - 历史视图样式

### 需要更新的翻译文件

1. **`public/locales/zh-CN/chat.json`** - 中文翻译
2. **`public/locales/en-US/chat.json`** - 英文翻译

### 需要更新的错误码

1. **`app/errors/error-codes.ts`** - 添加 CHAT_REQUEST_CANCELLED

### 历史页面优化相关

1. **`app/components/chat/HistoryToolbar.tsx`** - 重构使用 HeroUI
2. **`app/components/chat/ConversationList.tsx`** - 重构使用 HeroUI Card
3. **`app/components/chat/MessagePreviewPanel.tsx`** - 优化预览面板

---

## 测试要点

### Phase 1 测试

- [ ] 模型选择器正确显示在消息列表和输入框之间
- [ ] 删除会话头部后布局正常
- [ ] 不同屏幕尺寸下布局正确

### Phase 2 测试

- [ ] 禁止连续发送用户消息
- [ ] 重试按钮正确显示和工作
- [ ] 等待提示正确显示
- [ ] 自动会话管理正常

### Phase 3 测试

- [ ] 取消聊天后后台立即停止
- [ ] 取消标记正确添加到消息
- [ ] 刷新页面时正确保存
- [ ] Tab切换不触发保存

### Phase 4 测试

- [ ] 历史页面使用 HeroUI 组件
- [ ] 窄屏下布局正确（左右排布 vs 上下排布）
- [ ] 预览面板在窄屏下显示为底部抽屉

---

## 风险和注意事项

### 高风险项

1. **删除 ChatSessionHeader** - 确认功能在历史视图中完整保留
2. **取消机制浏览器兼容性** - AbortController 和 beforeunload 异步操作
3. **消息同步循环** - 指纹缓存需仔细测试

### 中风险项

1. **HeroUI v3 Beta API** - 可能不稳定
2. **响应式布局** - 窄屏预览面板需额外调整

### 缓解措施

- 每个 Phase 完成后创建 git commit
- 充分测试不同场景和屏幕尺寸
- 保留原有组件文件作为备选

---

## 实施顺序建议

1. **Phase 1** (2-3小时) - 布局重构，视觉效果明显
2. **Phase 2** (2-3小时) - 聊天逻辑优化，提升用户体验
3. **Phase 3** (3-4小时) - 修复取消Bug，解决关键问题
4. **Phase 4** (4-5小时) - 历史页面优化，完善整体体验

总计预估时间：11-15小时

---

## 待确认问题

实施前需要确认的细节：

1. **会话头部功能**：删除ChatSessionHeader后，标题、消息计数、保存状态是否需要在其他地方显示？
2. **取消标记**：用户取消的系统消息是否需要特殊样式？刷新导致的断开消息是否需要显示？
3. **重试功能**：删除最后一条消息并恢复到输入框时，是否需要二次确认？

这些细节不影响整体架构，可以在实施时根据实际效果调整。

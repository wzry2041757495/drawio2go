# 前端聊天页面优化实施计划

**创建日期**: 2025-11-20
**状态**: 规划中
**优先级**: P0 - 核心功能修复

---

## 📋 问题总结

根据对现有代码的深度分析，当前聊天页面存在以下核心问题：

### 1. 消息保存延迟风险

- **现状**: 仅在 AI 响应完成后通过 `onFinish` 回调批量保存消息
- **问题**:
  - AI 响应过程中切换 tab → 消息永久丢失
  - 浏览器崩溃/刷新 → 未保存消息丢失
  - 网络中断 → 数据无法恢复
- **影响**: 用户体验差，数据安全性低
- **技术原因**: 当前保存逻辑位于 `ChatSidebar.tsx` 的 `onFinish` 回调中，只在 AI 完成响应后触发

### 2. 切换 Tab 状态丢失

- **现状**: `UnifiedSidebar.tsx` 使用 HeroUI 的 `<Tabs.Panel>` 条件渲染，切换 tab 时 `ChatSidebar` 组件完全卸载
- **问题**:
  - 正在进行的 AI 对话中断
  - 用户输入草稿丢失
  - 工具调用展开状态重置
  - 消息列表滚动位置丢失
- **根本原因**: HeroUI Tabs 组件默认卸载非激活面板，导致组件内所有 React 状态（包括 `useChat` 的内存状态）全部清空
- **技术细节**: 位于 `UnifiedSidebar.tsx` 第 172-194 行的 Tabs 实现

### 3. 历史记录 UI 局限

- **现状**: 简单的下拉菜单（`ChatSessionMenu.tsx`），只能选择对话
- **问题**:
  - 无法搜索历史对话
  - 无法批量管理对话（删除、导出等）
  - 无法预览对话内容
  - 交互体验不够直观
- **技术现状**: 当前使用 `ChatSessionHeader` + `ChatSessionMenu` 组件实现简单下拉

---

## 🎯 用户需求确认

根据与用户的沟通，确定以下设计方向：

| 需求项           | 选择方案                                     |
| ---------------- | -------------------------------------------- |
| **自动保存机制** | 有变化时每 1 秒保存（防抖）                  |
| **历史页面形式** | 侧边栏内页面（视图切换）                     |
| **状态保存范围** | 消息历史 + 输入草稿 + UI 展开状态 + 滚动位置 |
| **历史页面功能** | 搜索过滤 + 批量操作 + 消息预览 + 列表展示    |

---

## 🚀 实施方案

### 任务 1: 实现防抖自动保存机制

**目标**: 检测到消息变化时，1 秒后自动保存到存储层，防止数据丢失

#### 1.1 核心功能设计

**修改文件**: `app/components/ChatSidebar.tsx`

**功能要点**:

1. **添加保存状态管理**
   - 添加保存中状态标识（isSaving）
   - 添加定时器引用（saveTimeoutRef）用于防抖控制

2. **提取保存逻辑为独立函数**
   - 将当前 `onFinish` 回调中的保存逻辑抽取为独立的 `saveMessagesToStorage` 函数
   - 函数功能：过滤需要保存的消息、调用存储层 API、更新会话时间戳
   - 参数：会话 ID、消息数组

3. **创建防抖保存函数**
   - 实现 `debouncedSave` 函数
   - 清除之前的定时器，设置新的 1 秒延时
   - 延时结束后调用 `saveMessagesToStorage`
   - 捕获错误并显示提示

4. **监听消息变化自动触发保存**
   - 使用 `useEffect` 监听 `messages` 和 `activeConversationId` 变化
   - 当消息数组有变化时，调用 `debouncedSave`
   - 组件卸载时清理定时器

5. **可选：显示保存状态指示器**
   - 在聊天头部显示"保存中..."提示
   - 保存成功后隐藏提示

#### 1.2 边界情况处理

- **快速切换对话**:
  - 保存前切换到新对话时，需要立即完成上一个对话的保存
  - 在切换对话的处理函数中，检查是否有未完成的保存任务

- **重复保存**:
  - 通过消息指纹（ID + 内容哈希）避免重复写入
  - 在存储层进行去重检查

- **保存失败**:
  - 实现重试机制（最多 3 次，使用指数退避策略）
  - 失败后显示用户提示
  - 可选：失败时暂存到 sessionStorage 作为备份

#### 1.3 性能优化

- **增量保存**:
  - 对比 `conversationMessages` 缓存，识别新增/修改的消息
  - 只保存发生变化的消息，而不是全量保存

- **批量写入**:
  - 使用 IndexedDB/SQLite 的事务机制
  - 一次性批量写入多条消息，减少 I/O 次数

---

### 任务 2: 修复切换 Tab 状态丢失

#### 2.1 修改 UnifiedSidebar 保持组件挂载

**目标**: 让所有侧边栏面板始终保持挂载状态，只通过 CSS 控制显示

**修改文件**: `app/components/UnifiedSidebar.tsx`

**实现方案**:

1. **保留 Tabs 导航栏**
   - 继续使用 HeroUI 的 `<Tabs>` 组件作为导航标签栏
   - 只使用 Tab 按钮部分，不使用 `<Tabs.Panel>` 组件

2. **手动控制内容显示**
   - 移除所有 `<Tabs.Panel>` 组件
   - 创建独立的容器 div 包裹所有侧边栏内容
   - 为每个面板（聊天、设置、版本）创建单独的 div 容器
   - 使用内联样式或 className 控制 `display` 属性
   - 当 `selectedTab === 'chat'` 时，聊天面板显示 `block`，其他显示 `none`

3. **原理说明**
   - 所有侧边栏面板始终挂载在 DOM 中
   - 使用 CSS `display: none` 隐藏非激活面板
   - 组件状态（包括 `useChat` 的内存状态）完全保留
   - 切换 tab 只是 CSS 属性变化，不触发组件卸载/重新挂载

4. **样式调整**
   - 在 `app/styles/components/unified-sidebar.css` 中添加样式
   - 定义 `.sidebar-content-container` 容器样式
   - 定义 `.sidebar-panel` 面板样式
   - 确保面板填充父容器高度，启用垂直滚动

**验证方式**:

- 切换 tab 后，聊天组件的 React DevTools 中状态值应保持不变
- 正在进行的 AI 对话不会中断
- 用户输入的草稿内容应保留

#### 2.2 持久化额外 UI 状态

**目标**: 将输入草稿、展开状态、滚动位置等保存到 sessionStorage，即使意外刷新页面也能恢复

##### 2.2.1 创建 useSessionStorage Hook

**新建文件**: `app/hooks/useSessionStorage.ts`

**功能说明**:

1. **接口设计**
   - 泛型函数，支持任意类型的值
   - 参数：storage key（字符串）、初始值
   - 返回：当前值、更新函数（类似 useState）

2. **读取逻辑**
   - 组件初始化时从 `window.sessionStorage` 读取值
   - 使用 JSON.parse 解析存储的字符串
   - 处理 SSR 环境（`window` 未定义的情况）
   - 捕获解析错误，返回默认初始值

3. **写入逻辑**
   - 更新 React 状态
   - 同步写入 sessionStorage（使用 JSON.stringify）
   - 支持函数式更新（类似 useState）
   - 捕获写入错误（配额超限等）

4. **错误处理**
   - 读取失败时打印警告，返回初始值
   - 写入失败时打印警告，至少保证内存状态正常

##### 2.2.2 在 ChatSidebar 中应用

**修改文件**: `app/components/ChatSidebar.tsx`

**功能实现**:

1. **定义 UI 状态结构**
   - 为每个对话生成独立的 storage key（`chat-ui-state-${conversationId}`）
   - 状态对象包含：
     - `inputDraft`: 输入框草稿文本
     - `expandedToolCalls`: 展开的工具调用 ID 数组
     - `expandedThinkingBlocks`: 展开的思考块 ID 数组
     - `scrollPosition`: 消息列表滚动位置（像素值）

2. **输入草稿持久化**
   - 使用 `useSessionStorage` hook 管理 UI 状态
   - 将输入框的 `input` 状态与 `uiState.inputDraft` 同步
   - 使用 `useEffect` 监听 `input` 变化，更新 `uiState`

3. **工具调用展开状态**
   - 使用 `Set` 数据结构管理展开状态
   - 从 `uiState.expandedToolCalls` 数组恢复 Set
   - 使用 `useEffect` 监听 `expandedToolCalls` 变化，同步到 `uiState`

4. **思考块展开状态**
   - 同上，管理 `expandedThinkingBlocks` 状态

5. **滚动位置恢复**
   - 添加消息列表容器的 ref（`messagesEndRef`）
   - 切换对话时（`activeConversationId` 变化），恢复对应的滚动位置
   - 滚动时保存位置（使用防抖，避免频繁写入）
   - 实现 `handleScroll` 函数，更新 `uiState.scrollPosition`

##### 2.2.3 debounce 工具函数

**实现方案**:

- 如果项目中没有 debounce 函数，可以选择：
  - 方案 A: 安装 `lodash-es` 依赖，导入 `debounce` 函数
  - 方案 B: 在 `app/lib/utils.ts` 中自己实现简单的 debounce
- debounce 功能：延迟执行函数，多次调用时只执行最后一次
- 用于滚动位置保存，避免每次滚动事件都触发写入

---

### 任务 3: 创建历史对话页面

#### 3.1 新建历史视图主组件

**新建文件**: `app/components/chat/ChatHistoryView.tsx`

**组件功能**:

1. **顶层容器结构**
   - 使用 flexbox 垂直布局
   - 包含三个主要区域：工具栏、对话列表、预览面板（可选）

2. **状态管理**
   - 搜索查询字符串（`searchQuery`）
   - 日期范围过滤（`dateRange`：开始时间、结束时间）
   - 批量选择模式开关（`selectionMode`）
   - 已选择的对话 ID 集合（`selectedIds`：Set 类型）
   - 当前预览的对话 ID（`previewConversationId`）

3. **过滤对话列表**
   - 使用 `useMemo` 优化性能
   - 根据 `searchQuery` 进行标题模糊匹配
   - 根据 `dateRange` 进行时间范围过滤
   - 返回过滤后的对话数组

4. **批量操作处理**
   - **批量删除**:
     - 检查是否有选中项
     - 显示确认对话框，提示删除数量和不可恢复性
     - 调用父组件传入的 `onDeleteConversations` 回调
     - 删除成功后清空选择状态，退出选择模式
   - **批量导出**:
     - 检查是否有选中项
     - 调用父组件传入的 `onExportConversations` 回调

5. **选择交互**
   - **切换单个选择**: 维护 `selectedIds` Set，添加/移除对话 ID
   - **全选/取消全选**:
     - 如果当前已全选，则清空选择
     - 否则将过滤后的所有对话 ID 添加到选择集合

6. **Props 接口**
   - `currentProjectId`: 当前项目 UUID
   - `conversations`: 对话数组
   - `onSelectConversation`: 选择对话回调
   - `onBack`: 返回聊天视图回调
   - `onDeleteConversations`: 批量删除回调
   - `onExportConversations`: 批量导出回调

#### 3.2 创建工具栏组件

**新建文件**: `app/components/chat/HistoryToolbar.tsx`

**组件功能**:

1. **第一行工具栏**
   - **返回按钮**:
     - 使用箭头图标（ArrowLeft）
     - 点击触发 `onBack` 回调
   - **搜索框**:
     - 输入框组件，占据剩余空间（flex: 1）
     - 显示搜索图标（Search）
     - 绑定 `searchQuery` 值和 `onSearchChange` 回调
   - **批量操作按钮**:
     - 切换选择模式
     - 选择模式激活时高亮显示
     - 图标：CheckSquare

2. **第二行批量操作栏**（仅在选择模式下显示）
   - **全选按钮**:
     - 根据当前选择状态显示"全选"或"取消全选"文字
   - **选择计数**:
     - 显示"已选择 X 个对话"
   - **操作按钮组**:
     - **导出按钮**: 蓝色主题，下载图标，选中为空时禁用
     - **删除按钮**: 红色危险主题，垃圾桶图标，选中为空时禁用

3. **Props 接口**
   - `onBack`: 返回回调
   - `searchQuery`: 搜索文本
   - `onSearchChange`: 搜索变化回调
   - `selectionMode`: 选择模式状态
   - `onToggleSelectionMode`: 切换选择模式回调
   - `selectedCount`: 已选择数量
   - `totalCount`: 总对话数量
   - `onSelectAll`: 全选回调
   - `onBatchDelete`: 批量删除回调
   - `onBatchExport`: 批量导出回调

#### 3.3 创建对话列表组件

**新建文件**: `app/components/chat/ConversationList.tsx`

**组件功能**:

1. **空状态处理**
   - 当对话数组为空时，显示空状态占位符
   - 显示消息气泡图标（MessageCircle）
   - 显示提示文字："暂无历史对话"

2. **列表渲染**
   - 遍历 `conversations` 数组
   - 每个对话渲染为 Card 卡片组件
   - Card 可点击（非选择模式下）

3. **对话项内容**
   - **选择框**:
     - 仅在选择模式下显示
     - Checkbox 组件，绑定选中状态
     - 点击触发 `onToggleSelect` 回调
   - **对话信息**:
     - 标题：显示对话标题文本
     - 元信息：显示创建时间（使用 date-fns 格式化为相对时间）
   - **预览按钮**:
     - 仅在非选择模式下显示
     - 眼睛图标（Eye）
     - 点击触发 `onPreview` 回调，阻止事件冒泡

4. **交互行为**
   - 非选择模式下，点击卡片触发 `onOpen` 回调
   - 选择模式下，点击卡片无效果，只能通过 Checkbox 选择

5. **Props 接口**
   - `conversations`: 对话数组
   - `selectionMode`: 选择模式状态
   - `selectedIds`: 已选择 ID 集合
   - `onToggleSelect`: 切换选择回调
   - `onPreview`: 预览回调
   - `onOpen`: 打开对话回调

6. **依赖**
   - 需要安装 `date-fns` 库用于日期格式化
   - 需要安装 `lucide-react` 图标库（如果未安装）

#### 3.4 创建消息预览面板

**新建文件**: `app/components/chat/MessagePreviewPanel.tsx`

**组件功能**:

1. **面板定位**
   - 固定定位（fixed）在屏幕右侧
   - 宽度 400px（响应式：小屏幕时 100%）
   - 高度占满视口（100vh）
   - 显示在最上层（z-index: 100）

2. **加载消息**
   - 使用 `useEffect` 监听 `conversationId` 变化
   - 调用存储层 API `getMessages(conversationId)` 加载消息
   - 只取前 10 条消息作为预览
   - 设置加载状态（`loading`）

3. **头部区域**
   - 标题："消息预览"
   - 操作按钮组：
     - **打开对话按钮**: 外部链接图标，触发 `onOpen` 回调
     - **关闭按钮**: X 图标，触发 `onClose` 回调

4. **消息列表区域**
   - **加载状态**: 显示"加载中..."
   - **消息渲染**:
     - 遍历消息数组
     - 显示角色标签（用户/AI）
     - 显示消息内容（截取前 200 字符，超出显示省略号）
   - **更多提示**:
     - 如果消息数量 >= 10，显示"还有更多消息..."

5. **动画效果**
   - 从右侧滑入（slideInFromRight 动画）
   - 动画时长 0.3 秒

6. **Props 接口**
   - `conversationId`: 对话 ID
   - `onClose`: 关闭回调
   - `onOpen`: 打开对话回调

#### 3.5 在 ChatSidebar 中集成历史视图

**修改文件**: `app/components/ChatSidebar.tsx`

**功能实现**:

1. **添加视图状态**
   - 新增 `currentView` 状态：'chat' | 'history'
   - 默认值为 'chat'

2. **批量操作处理函数**
   - **批量删除处理** (`handleBatchDelete`):
     - 调用存储层 `batchDeleteConversations(ids)` 方法
     - 刷新对话列表：重新调用 `getAllConversations(currentProjectId)`
     - 更新 `conversations` 状态
   - **批量导出处理** (`handleBatchExport`):
     - 调用存储层 `exportConversations(ids)` 方法，获取 Blob
     - 创建下载链接（`URL.createObjectURL`）
     - 创建隐藏的 `<a>` 元素，触发下载
     - 文件名格式：`conversations-${时间戳}.json`
     - 下载后释放 URL 对象

3. **视图切换渲染**
   - 根据 `currentView` 条件渲染：
     - **聊天视图** (`currentView === 'chat'`):
       - 显示 `ChatSessionHeader`
       - 显示 `MessageList`
       - 显示 `ChatInputArea`
     - **历史视图** (`currentView === 'history'`):
       - 显示 `ChatHistoryView` 组件
       - 传递 props：
         - `currentProjectId`
         - `conversations`
         - `onSelectConversation`: 选择对话后切换回聊天视图
         - `onBack`: 返回聊天视图
         - `onDeleteConversations`: 批量删除处理
         - `onExportConversations`: 批量导出处理

#### 3.6 修改 ChatSessionHeader

**修改文件**: `app/components/chat/ChatSessionHeader.tsx`

**功能修改**:

1. **移除下拉菜单相关代码**
   - 删除 `showSessionMenu` 状态
   - 删除 `ChatSessionMenu` 组件的导入和渲染

2. **修改按钮行为**
   - 历史按钮不再是 toggle 下拉菜单
   - 改为直接调用 `onHistoryClick` 回调
   - 图标改为时钟图标（Clock）
   - 文字显示"历史记录"

3. **Props 接口修改**
   - 移除 `onToggleMenu` prop
   - 添加 `onHistoryClick` prop（类型：`() => void`）
   - 保留 `currentTitle` 和 `onNewSession`

4. **布局调整**
   - 历史记录按钮
   - 会话标题（中间，占据剩余空间）
   - 新对话按钮（Plus 图标）

---

### 任务 4: 实现搜索和批量操作

#### 4.1 增强搜索功能

**文件**: `app/hooks/useConversationSearch.ts`（如果不存在则创建）

**功能实现**:

1. **基础搜索 Hook**
   - 导出 `useConversationSearch` 函数
   - 参数：对话数组、过滤条件对象
   - 返回：过滤后的对话数组
   - 使用 `useMemo` 优化性能

2. **过滤条件**
   - **标题搜索**:
     - 如果 `filters.query` 存在，进行标题模糊匹配
     - 转换为小写后使用 `includes` 判断
   - **日期范围**:
     - 如果 `filters.startDate` 存在，过滤 `created_at >= startDate` 的对话
     - 如果 `filters.endDate` 存在，过滤 `created_at <= endDate` 的对话

3. **SearchFilters 接口**
   - `query?: string` - 搜索关键词
   - `startDate?: number` - 开始时间（时间戳）
   - `endDate?: number` - 结束时间（时间戳）

4. **可选扩展：搜索消息内容**
   - 导出 `searchInMessages` 异步函数
   - 参数：项目 ID、搜索关键词
   - 返回：包含匹配消息的对话数组
   - 实现逻辑：
     - 加载所有对话
     - 遍历每个对话，加载其所有消息
     - 检查消息内容是否包含关键词
     - 返回匹配的对话
   - 注意：性能开销较大，适合对话数量不多的场景

#### 4.2 批量操作：删除

**功能说明**: 一次性删除多个对话及其所有关联消息

**修改文件**: `app/lib/storage/indexeddb-storage.ts`

**实现要点**:

1. **导出函数**: `batchDeleteConversations(conversationIds: string[]): Promise<void>`

2. **事务处理**
   - 打开包含 `conversations` 和 `messages` 两个对象存储的读写事务
   - 确保原子性：要么全部成功，要么全部失败

3. **删除逻辑**
   - 遍历所有对话 ID
   - 对于每个对话：
     - 删除对话记录（`conversations` 存储）
     - 查询所有关联消息（通过 `conversation_id` 索引）
     - 删除所有关联消息（`messages` 存储）

4. **错误处理**
   - 使用 try-catch 捕获错误
   - 打印错误日志
   - 抛出错误供上层处理

**修改文件**: `app/lib/storage/sqlite-storage.ts`

**实现要点**:

1. **导出函数**: `batchDeleteConversations(conversationIds: string[]): Promise<void>`

2. **SQL 事务**
   - 执行 `BEGIN TRANSACTION`
   - 删除操作失败时执行 `ROLLBACK`
   - 全部成功后执行 `COMMIT`

3. **删除逻辑**
   - 构造占位符字符串（`?` 用逗号连接）
   - 执行 `DELETE FROM messages WHERE conversation_id IN (...)`
   - 执行 `DELETE FROM conversations WHERE id IN (...)`

4. **错误处理**
   - try-catch 包裹事务
   - 错误时回滚事务
   - 抛出错误

#### 4.3 批量操作：导出

**功能说明**: 将多个对话及其消息导出为 JSON 文件

**修改文件**: `app/lib/storage/indexeddb-storage.ts`

**实现要点**:

1. **导出函数**: `exportConversations(conversationIds: string[]): Promise<Blob>`

2. **数据收集**
   - 创建空数组 `exportData`
   - 遍历所有对话 ID
   - 对于每个对话：
     - 从 `conversations` 存储读取对话信息
     - 从 `messages` 存储读取所有关联消息（通过 `conversation_id` 索引）
     - 组装为对象：`{ conversation, messages }`
     - 添加到 `exportData` 数组

3. **生成文件**
   - 将 `exportData` 序列化为 JSON 字符串（格式化：缩进 2 空格）
   - 创建 Blob 对象，MIME 类型为 `application/json`
   - 返回 Blob

4. **数据结构**
   - 导出格式：
     ```
     [
       {
         "conversation": { id, title, created_at, ... },
         "messages": [
           { id, role, content, ... },
           ...
         ]
       },
       ...
     ]
     ```

**修改文件**: `app/lib/storage/sqlite-storage.ts`

**实现要点**:

1. **导出函数**: `exportConversations(conversationIds: string[]): Promise<Blob>`

2. **SQL 查询**
   - 构造占位符字符串
   - 查询对话：`SELECT * FROM conversations WHERE id IN (...)`
   - 查询消息：`SELECT * FROM messages WHERE conversation_id IN (...)`

3. **数据组织**
   - 遍历对话数组
   - 对于每个对话，从消息数组中过滤出属于该对话的消息
   - 组装为对象：`{ conversation, messages }`

4. **生成文件**
   - 同 IndexedDB 实现，序列化为 JSON 并创建 Blob

---

### 任务 5: 样式和动画

#### 5.1 历史视图样式

**新建文件**: `app/styles/components/history-view.css`

**样式要点**:

1. **历史视图容器** (`.chat-history-view`)
   - 使用 flexbox 垂直布局
   - 占满父容器高度
   - 背景色使用 CSS 变量 `var(--color-background)`

2. **工具栏样式** (`.history-toolbar`)
   - 固定在顶部
   - 底部边框分隔
   - 内边距使用 spacing 变量
   - 背景色使用 `var(--color-surface)`

3. **工具栏行** (`.toolbar-row`)
   - 水平排列，居中对齐
   - 子元素间距使用 gap
   - 批量操作行使用浅色背景高亮

4. **对话列表** (`.conversation-list`)
   - 垂直滚动
   - 内边距
   - 使用 flexbox 纵向排列
   - 子元素间距

5. **对话项** (`.conversation-item`)
   - Card 样式
   - hover 效果：轻微右移（4px）+ 阴影
   - 平滑过渡动画（0.2s）

6. **对话内容布局** (`.conversation-content`)
   - 水平排列：选择框、对话信息、预览按钮
   - 对话信息占据剩余空间
   - 子元素间距

7. **对话信息** (`.conversation-info`)
   - 标题：字体加粗、单行省略
   - 元信息：小字号、灰色、显示日期

8. **空状态** (`.empty-state`)
   - 居中对齐（垂直和水平）
   - 图标半透明
   - 提示文字灰色

9. **预览面板** (`.message-preview-panel`)
   - 固定定位在右侧
   - 宽度 400px（小屏幕 100%）
   - 高度占满视口
   - 阴影和边框
   - 滑入动画（从右侧滑入，0.3s）

10. **预览头部** (`.preview-header`)
    - 水平布局：标题、操作按钮
    - 底部边框分隔

11. **预览消息列表** (`.preview-messages`)
    - 垂直滚动
    - 内边距

12. **预览消息项** (`.preview-message`)
    - 角色标签：小字号、大写、颜色区分（用户/AI）
    - 消息内容：截断显示

13. **保存指示器** (`.saving-indicator`)
    - 内联 flex 布局
    - 成功色主题
    - 脉冲动画（1.5s 循环）

14. **动画定义**
    - `@keyframes slideInFromRight`: 从右侧滑入
    - `@keyframes pulse`: 透明度脉冲效果

15. **响应式**
    - 小于 768px 时，预览面板宽度 100%

#### 5.2 在全局样式中引入

**修改文件**: `app/layout.tsx` 或 `app/globals.css`

**操作**:

- 添加导入语句引入新样式文件
- 确保样式文件在组件渲染前加载

---

## 📁 文件清单

### 需要修改的文件

| 文件路径                                    | 修改内容                               | 优先级 |
| ------------------------------------------- | -------------------------------------- | ------ |
| `app/components/UnifiedSidebar.tsx`         | 移除 `<Tabs.Panel>`，改用 CSS 控制显示 | P0     |
| `app/components/ChatSidebar.tsx`            | 添加自动保存、视图切换、批量操作处理   | P0     |
| `app/components/chat/ChatSessionHeader.tsx` | 修改历史按钮行为，移除下拉菜单         | P1     |
| `app/lib/storage/indexeddb-storage.ts`      | 添加批量删除、导出方法                 | P1     |
| `app/lib/storage/sqlite-storage.ts`         | 添加批量删除、导出方法                 | P1     |
| `app/layout.tsx` 或 `globals.css`           | 引入新样式文件                         | P2     |

### 需要创建的文件

| 文件路径                                      | 功能说明                                 | 优先级 |
| --------------------------------------------- | ---------------------------------------- | ------ |
| `app/hooks/useSessionStorage.ts`              | Session Storage hook，管理 UI 状态持久化 | P0     |
| `app/components/chat/ChatHistoryView.tsx`     | 历史视图主组件，包含搜索、列表、预览     | P1     |
| `app/components/chat/HistoryToolbar.tsx`      | 工具栏组件，包含搜索框和批量操作按钮     | P1     |
| `app/components/chat/ConversationList.tsx`    | 对话列表组件，支持选择和预览             | P1     |
| `app/components/chat/MessagePreviewPanel.tsx` | 预览面板组件，显示对话的前几条消息       | P2     |
| `app/hooks/useConversationSearch.ts`          | 搜索 hook，封装过滤逻辑（可选）          | P2     |
| `app/styles/components/history-view.css`      | 历史视图样式文件                         | P2     |
| `app/lib/utils.ts`                            | 工具函数（如需自己实现 debounce）        | P2     |

### 可能需要安装的依赖

```bash
pnpm add date-fns        # 日期格式化库
pnpm add lucide-react    # 图标库（如果未安装）
pnpm add lodash-es       # 可选：如果需要 debounce 函数
```

---

## 🔄 实施顺序建议

### 阶段 1：核心修复（P0，预计 1-2 天）

**目标**: 修复状态丢失和数据丢失的关键问题

1. **任务 2.1**: 修改 `UnifiedSidebar.tsx`
   - 移除 `<Tabs.Panel>` 条件渲染
   - 使用 CSS `display` 控制显示
   - 添加容器样式
   - 测试：切换 tab 后聊天状态是否保留

2. **任务 1**: 实现自动保存机制
   - 提取保存逻辑为独立函数
   - 添加防抖保存逻辑
   - 监听 messages 变化自动触发
   - 添加保存状态指示器（可选）
   - 测试：AI 响应中途切换 tab，返回后消息是否已保存

3. **任务 2.2.1**: 创建 `useSessionStorage` hook
   - 实现基本的读写逻辑
   - 添加错误处理
   - 处理 SSR 环境

### 阶段 2：历史页面基础（P1，预计 2-3 天）

**目标**: 实现历史记录查看和选择功能

4. **任务 3.1-3.3**: 创建历史视图基础组件
   - 创建 `ChatHistoryView.tsx`（暂不实现批量操作）
   - 创建 `HistoryToolbar.tsx`（暂不实现批量操作按钮）
   - 创建 `ConversationList.tsx`
   - 测试：能否正常显示对话列表

5. **任务 3.5-3.6**: 集成历史视图
   - 在 `ChatSidebar` 中添加视图切换逻辑
   - 修改 `ChatSessionHeader` 按钮行为
   - 连接各组件的回调函数
   - 测试：点击历史按钮 → 显示历史列表 → 选择对话 → 返回聊天视图

6. **任务 2.2.2**: 应用 `useSessionStorage`
   - 保存输入草稿
   - 保存展开状态（工具调用、思考块）
   - 保存滚动位置
   - 测试：切换对话后状态是否恢复

### 阶段 3：高级功能（P1-P2，预计 2-3 天）

**目标**: 添加搜索、批量操作、预览等高级功能

7. **任务 4.1**: 实现搜索功能
   - 实现标题搜索（简单）
   - 可选：实现消息内容搜索（复杂）
   - 测试：搜索框输入后列表是否正确过滤

8. **任务 4.2-4.3**: 实现批量操作
   - 存储层：实现 `batchDeleteConversations` 方法（IndexedDB + SQLite）
   - 存储层：实现 `exportConversations` 方法（IndexedDB + SQLite）
   - UI层：完善工具栏的批量操作按钮
   - UI层：实现选择模式交互
   - 测试：选择多个对话 → 批量删除 → 验证数据库
   - 测试：选择多个对话 → 批量导出 → 验证 JSON 文件

9. **任务 3.4**: 消息预览面板
   - 创建 `MessagePreviewPanel.tsx`
   - 集成到 `ChatHistoryView`
   - 添加滑入动画
   - 测试：点击预览按钮 → 显示预览面板 → 显示前 10 条消息

### 阶段 4：优化和测试（P2，预计 1-2 天）

**目标**: 完善样式、性能优化、全面测试

10. **任务 5**: 样式和动画
    - 编写 `history-view.css` 完整样式
    - 调整动画效果（滑入、hover、脉冲）
    - 响应式适配（小屏幕）
    - 引入到全局样式

11. **性能优化**:
    - 历史列表虚拟滚动（如果对话数量很多，可使用 `react-window` 或 `react-virtuoso`）
    - 自动保存优化（增量保存，避免全量写入）
    - 预览面板懒加载（延迟加载消息）

12. **全面测试**:
    - 边界情况：空对话列表、大量消息、特殊字符、超长标题
    - 跨浏览器测试（Chrome、Firefox、Safari）
    - Electron 环境测试（SQLite 存储是否正常）
    - 性能测试：大量对话（100+）下的流畅度

---

## ⚠️ 注意事项和风险

### 1. 执行破坏性更改

- 无需考虑向后兼容性，如有任意破坏性更改，直接执行并认为更改后的就是最初版本版本

### 2. 性能考虑

#### 2.1 自动保存频率

- **风险**: 频繁写入 IndexedDB/SQLite 可能影响性能，尤其是长对话
- **优化策略**:
  - 使用防抖（1秒）减少写入次数
  - 增量保存：对比缓存，只保存变化的消息
  - 批量写入：使用事务一次性写入多条消息
  - 监控性能：添加性能埋点，观察写入耗时

#### 2.2 历史列表性能

- **风险**: 对话数量过多（100+）时列表渲染卡顿
- **优化策略**:
  - 虚拟滚动：使用 `react-window` 或 `react-virtuoso`，只渲染可见区域
  - 分页加载：每次加载 20-50 条，滚动到底部时加载更多
  - 懒加载消息计数：不在初始化时统计所有对话的消息数量

### 3. 错误处理

#### 3.1 自动保存失败

- **场景**: 存储空间不足、IndexedDB 权限问题、数据库损坏
- **处理方案**:
  - 重试机制（最多 3 次，使用指数退避：1s、2s、4s）
  - 用户提示："自动保存失败，请检查存储空间"或"数据库错误，请刷新页面"
  - 降级方案：失败时暂存到 sessionStorage 作为临时缓冲
  - 恢复机制：页面加载时检查 sessionStorage，提示用户恢复未保存的数据

#### 3.2 批量删除失败

- **场景**: 事务中途失败（如数据库锁定、磁盘错误）
- **处理方案**:
  - 使用数据库事务确保原子性（要么全部成功，要么全部失败）
  - 失败时自动回滚
  - 显示详细错误信息给用户
  - 提供重试按钮

### 4. 用户体验

#### 4.1 加载状态

- 历史列表加载时显示骨架屏（Skeleton）
- 预览面板加载时显示 spinner 或骨架屏
- 批量操作时禁用 UI 并显示进度（如"正在删除 X/Y 个对话..."）

#### 4.2 确认提示

- 批量删除前显示确认对话框
- 提示删除数量和不可恢复性："确定要删除 5 个对话吗？此操作不可恢复。"
- 可选：添加"不再提示"选项

#### 4.3 快捷键（可选）

- `Ctrl+H` 或 `Cmd+H`: 打开历史视图
- `Escape`: 关闭预览面板、取消选择模式
- `Ctrl+A` 或 `Cmd+A`: 全选对话（在选择模式下）

### 5. 测试覆盖

#### 5.1 单元测试

- `useSessionStorage` hook 的读写逻辑
- 搜索过滤逻辑
- 批量操作的存储层方法（模拟数据库）

---

## 📊 成功指标

完成所有任务后，应满足以下标准：

### 功能指标

- ✅ 消息自动保存：检测到变化后 1 秒内保存到存储层
- ✅ 状态保持：切换 tab 后所有状态（消息、输入、展开状态、滚动位置）完整保留
- ✅ 历史浏览：可查看所有历史对话列表，按时间倒序排列
- ✅ 搜索功能：可按标题快速搜索对话
- ✅ 批量操作：可批量删除和导出对话，操作原子性保证
- ✅ 消息预览：可预览对话的前 10 条消息，无需打开完整对话

### 性能指标

- ✅ 自动保存延迟 < 100ms（防抖后的实际写入时间）
- ✅ 历史列表加载 < 500ms（100 条对话）
- ✅ 视图切换无卡顿（< 16ms，保持 60fps）
- ✅ 搜索响应 < 100ms（本地过滤，500 条对话内）

### 用户体验指标

- ✅ 无数据丢失情况（AI 响应中途切换 tab，消息仍然保存）
- ✅ 切换 tab 体验流畅（无重新渲染闪烁）
- ✅ 历史记录查找方便（搜索响应快速）
- ✅ 批量操作效率高（多选、删除流程顺畅）

---

**最后更新**: 2025-11-20
**负责人**: 待定
**审核人**: 待定

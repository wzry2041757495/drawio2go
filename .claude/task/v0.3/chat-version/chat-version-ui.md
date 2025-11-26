# 工具调用卡片自动版本显示功能

## 一、功能需求

在工具调用卡片上方添加自动创建版本的显示功能：

1. **触发条件**：仅在 `drawio_edit_batch` 和 `drawio_overwrite` 工具成功执行后显示
2. **视觉样式**：轻量提示条（图标 + 文本 + 虚线上边框）显示"已保存至版本 vx.y.z.n"
3. **交互功能**：点击跳转到版本侧栏并定位到对应版本
4. **数据持久化**：页面刷新后自动恢复提示条显示

## 二、用户确认的实现细节

- ✅ **版本创建方式**：AI 工具执行成功后自动创建子版本（格式 x.y.z.n）
- ✅ **提示条位置**：紧贴在工具卡片的正上方（作为工具卡片的前置兄弟元素）
- ✅ **数据存储**：在 XMLVersion.metadata.toolCallId 字段中存储关联的 toolCallId
- ✅ **跳转行为**：展开版本侧栏，切换到对应视图（主视图/子版本视图），无需滚动定位

## 三、核心技术方案

### 3.1 数据流架构

```
AI 工具调用 (drawio-ai-tools.ts)
  ↓ 提取 toolCallId
tool-executor.ts (Socket.IO 传递)
  ↓
useDrawioSocket.ts (前端接收)
  ↓ handleAutoVersionSnapshot
createHistoricalVersion (传递 toolCallId)
  ↓ persistHistoricalVersion
存储到 XMLVersion.metadata.toolCallId
  ↓
MessageContent 渲染时查询 (useVersionHint Hook)
  ↓ 内存缓存查询 (Map<toolCallId, XMLVersion>)
显示 VersionHintBanner 组件
```

### 3.2 关键设计决策

**数据存储方案**
- 使用 `XMLVersion.metadata.toolCallId` 字段存储工具调用 ID
- 保持 metadata 扁平结构，避免嵌套
- 支持页面刷新后通过 toolCallId 反向查询版本

**查询性能优化**
- 创建 `useVersionHint` Hook，构建内存缓存（Map 结构）
- 订阅版本列表变化，自动更新缓存
- O(1) 查询复杂度，避免渲染时的重复查询

**组件插入位置**
- 在 MessageContent 组件中渲染
- 作为工具卡片（ToolCallCard）的前置兄弟元素
- 使用 React.Fragment 包裹提示条和工具卡片

**视图切换逻辑**
- 通过回调链传递导航事件：page.tsx → UnifiedSidebar → VersionSidebar
- 判断目标版本类型（主版本/子版本）自动切换对应视图
- 使用 targetVersionId 状态传递目标版本信息

## 四、实现步骤

### 阶段 1：核心数据流（约 2 小时）

**目标**：确保 AI 工具执行时 toolCallId 正确存储到版本 metadata

#### 1.1 类型定义补充
- **文件**：`app/lib/storage/types.ts`
- **任务**：在 XMLVersion.metadata 字段注释中补充 toolCallId 说明

#### 1.2 版本创建层修改
- **文件**：`app/lib/storage/writers.ts`
- **任务**：
  - 在 PersistHistoricalOptions 接口添加 toolCallId 字段
  - 在 persistHistoricalVersion 函数中构建 metadata 对象
  - 传递 metadata 到 storage.createXMLVersion

#### 1.3 Hook 层修改
- **文件**：`app/hooks/useStorageXMLVersions.ts`
- **任务**：
  - 在 CreateHistoricalVersionOptions 添加 toolCallId 字段
  - 在 createHistoricalVersion 函数中传递 toolCallId

#### 1.4 Socket Hook 修改
- **文件**：`app/hooks/useDrawioSocket.ts`
- **任务**：
  - 在 handleAutoVersionSnapshot 函数中提取 toolCallId
  - 传递给两次 createHistoricalVersion 调用（首个主版本 + 子版本）

#### 1.5 Socket 协议验证
- **文件**：`app/types/socket-protocol.ts`
- **任务**：确保 ToolCallRequest 接口包含 toolCallId 字段

#### 1.6 工具执行器修改
- **文件**：`app/lib/tool-executor.ts`
- **任务**：
  - 在 executeToolOnClient 函数添加 toolCallId 参数
  - 传递给 Socket.IO 请求

#### 1.7 AI 工具定义修改 ⚠️
- **文件**：`app/lib/drawio-ai-tools.ts`
- **任务**：从 AI SDK 的 tool.execute context 参数中提取 toolCallId
- **关键风险**：AI SDK 可能无法直接提供 toolCallId
- **备选方案**：使用 Socket 请求的 requestId 作为唯一标识符
- **实施建议**：先添加日志调试 context 对象结构

---

### 阶段 2：UI 组件（约 2 小时）

**目标**：创建版本提示条组件并集成到消息渲染流程

#### 2.1 创建版本提示条组件
- **新文件**：`app/components/chat/VersionHintBanner.tsx`
- **组件功能**：
  - 接收 versionLabel、versionId、onNavigate 等 Props
  - 轻量级按钮样式（History 图标 + 文本 + ChevronRight 箭头）
  - 点击触发导航回调

#### 2.2 添加样式定义
- **新文件**：`app/styles/components/version-hint-banner.css`
- **样式要求**：
  - 虚线上边框（1px dashed）
  - 悬停效果（背景色变化、箭头位移动画）
  - 使用 CSS 变量保证主题适配
  - 遵循项目设计系统规范（8px 间距、标准圆角）
- **修改文件**：`app/styles/components/index.css` 导入新样式

#### 2.3 创建版本查询 Hook
- **新文件**：`app/components/chat/hooks/useVersionHint.ts`
- **Hook 功能**：
  - 订阅当前项目的版本列表（subscribeVersions）
  - 构建 toolCallId → XMLVersion 的 Map 缓存
  - 提供 getVersionForToolCall 查询方法
  - 监听 projectUuid 变化，自动清空缓存

#### 2.4 集成到 MessageContent
- **文件**：`app/components/chat/MessageContent.tsx`
- **任务**：
  - 导入 VersionHintBanner 组件和 useVersionHint Hook
  - 更新 Props 接口（添加 projectUuid 和 onNavigateToVersion）
  - 在工具调用渲染逻辑中查询关联版本
  - 仅在 state === "output-available" 且有关联版本时显示提示条
  - 使用 React.Fragment 包裹提示条和工具卡片

---

### 阶段 3：导航逻辑（约 1.5 小时）

**目标**：实现点击提示条后的侧栏展开和视图切换

#### 3.1 Props 传递链
- **涉及文件**：
  - `app/components/chat/MessageList.tsx`（如果 MessageContent 在此渲染）
  - `app/components/ChatSidebar.tsx`
- **任务**：确保 projectUuid 和 onNavigateToVersion 从 page.tsx 传递到 MessageContent

#### 3.2 UnifiedSidebar 修改
- **文件**：`app/components/UnifiedSidebar.tsx`
- **任务**：
  - 更新 Props 接口（添加 onNavigateToVersion、targetVersionId、onVersionTargetHandled）
  - 传递 onNavigateToVersion 给 ChatSidebar
  - 传递 targetVersionId 和 onVersionTargetHandled 给 VersionSidebar

#### 3.3 page.tsx 导航逻辑
- **文件**：`app/page.tsx`
- **任务**：
  - 添加 targetVersionId 状态
  - 实现 handleNavigateToVersion 回调：
    - 展开侧栏（如已收起）
    - 切换到版本 Tab
    - 设置 targetVersionId
  - 实现 handleVersionTargetHandled 回调：清除 targetVersionId
  - 传递给 UnifiedSidebar

#### 3.4 VersionSidebar 响应导航
- **文件**：`app/components/VersionSidebar.tsx`
- **任务**：
  - 更新 Props 接口（添加 targetVersionId、onTargetHandled）
  - 添加 useEffect 监听 targetVersionId 变化
  - 查找目标版本，判断是主版本还是子版本
  - 切换到对应视图（主视图或子版本视图）
  - 调用 onTargetHandled 标记处理完成
  - 导入版本工具函数（isSubVersion、getParentVersion）

---

## 五、关键文件清单

### 需要修改的文件（14 个）

**核心数据流（7 个）**
1. `app/lib/storage/types.ts` - 补充 metadata 注释
2. `app/lib/storage/writers.ts` - 添加 toolCallId 参数和存储逻辑
3. `app/hooks/useStorageXMLVersions.ts` - 传递 toolCallId
4. `app/hooks/useDrawioSocket.ts` - 提取并传递 toolCallId
5. `app/types/socket-protocol.ts` - 验证 toolCallId 字段
6. `app/lib/tool-executor.ts` - 传递 toolCallId 到前端
7. `app/lib/drawio-ai-tools.ts` - 从 AI SDK 获取 toolCallId

**UI 层（4 个）**
8. `app/components/chat/MessageContent.tsx` - 集成版本提示条
9. `app/components/ChatSidebar.tsx` - 传递 Props
10. `app/components/chat/MessageList.tsx` - 传递 Props（如需要）
11. `app/styles/components/index.css` - 导入新样式

**导航层（3 个）**
12. `app/components/UnifiedSidebar.tsx` - 传递导航信息
13. `app/page.tsx` - 实现导航逻辑
14. `app/components/VersionSidebar.tsx` - 响应导航切换视图

### 需要新建的文件（3 个）

1. `app/components/chat/VersionHintBanner.tsx` - 版本提示条组件
2. `app/styles/components/version-hint-banner.css` - 样式定义
3. `app/components/chat/hooks/useVersionHint.ts` - 版本查询 Hook

**共计：17 个文件**

---

## 六、技术细节和注意事项

### 6.1 toolCallId 获取问题（关键风险）

**问题**：AI SDK 的 tool.execute 可能无法直接获取 toolCallId

**解决方案**：
- **方案 1**（推荐）：从 tool.execute 的 context 参数提取
  - 需要查阅 Vercel AI SDK 文档确认 context 结构
  - 添加日志调试验证 context 对象
- **方案 2**（备选）：使用 Socket 请求的 requestId 作为唯一标识符
  - 在 tool-executor.ts 中将 requestId 传递给 toolCallId 字段
  - 确保 requestId 在整个调用链中保持一致

### 6.2 metadata 字段扩展性

**当前设计**：`metadata: { toolCallId: string }`

**未来扩展**（可选）：
- `toolName: string` - 工具名称
- `toolTimestamp: number` - 工具执行时间
- 保持扁平结构，避免嵌套对象

### 6.3 性能优化

**查询优化**：
- useVersionHint 使用 Map 缓存，O(1) 查询复杂度
- 仅在版本列表变化时重建缓存（通过 subscribeVersions）
- 避免在渲染函数中执行异步查询

**内存优化**（可选）：
- 如果版本数 > 1000，可限制缓存大小
- 仅缓存最近的版本

### 6.4 边界情况处理

**情况 1：版本不存在**
- 原因：版本被删除、项目切换等
- 处理：提示条不显示（versionInfo 为 null）

**情况 2：工具调用失败**
- 处理：仅在 state === "output-available" 时显示提示条
- 失败状态（output-error）不显示

**情况 3：页面刷新后缓存未加载**
- 处理：useVersionHint 通过订阅自动加载版本列表
- 初始渲染时版本未加载完成，提示条暂不显示
- 加载完成后自动触发重新渲染

**情况 4：跨项目切换**
- 处理：useVersionHint 监听 projectUuid 变化，自动清空缓存

### 6.5 样式设计原则

遵循项目设计系统规范：
- **圆角**：8px（var(--radius)）
- **间距**：8px 基准
- **字体大小**：0.875rem（14px）
- **颜色**：使用 CSS 变量（--accent、--text-secondary、--border 等）
- **动画**：150ms（var(--transition-fast)）
- **设计风格**：扁平化，避免复杂阴影和渐变

**虚线边框**：使用 border-top: 1px dashed var(--border)

**悬停效果**：
- 背景色：var(--surface-1)
- 边框：var(--border)
- 箭头位移：translateX(2px)

### 6.6 可访问性

- 提示条使用 role="banner" 和 aria-label
- 按钮使用 HeroUI Button 组件（内置 ARIA 属性）
- 键盘可操作（Enter/Space 触发导航）
- 屏幕阅读器友好

---

## 七、测试计划

### 7.1 单元测试（可选）

- useVersionHint Hook 的缓存逻辑
- 版本号解析工具函数（isSubVersion、getParentVersion）

### 7.2 集成测试

**测试 1：版本创建流程**
1. 手动创建主版本 v1.0.0
2. 检查 metadata 为 null
3. 使用 AI 工具（drawio_edit_batch）
4. 检查子版本 v1.0.0.1 的 metadata 包含 toolCallId
5. 再次使用 AI 工具
6. 检查子版本 v1.0.0.2 的 metadata

**测试 2：提示条显示**
1. 工具调用成功 → 提示条出现在卡片上方
2. 工具调用失败 → 提示条不显示
3. 工具调用中 → 提示条不显示
4. 页面刷新 → 提示条依然显示

**测试 3：导航跳转**
1. 侧栏已收起 → 点击提示条 → 侧栏展开，切换到版本 Tab
2. 侧栏已展开（聊天 Tab）→ 点击提示条 → 切换到版本 Tab
3. 点击主版本提示条 → 主视图显示
4. 点击子版本提示条 → 子版本视图显示

**测试 4：边界情况**
1. 版本删除后 → 提示条消失
2. 项目切换 → 提示条重新加载
3. 无版本关联 → 提示条不显示
4. 多个提示条同时显示 → 每个工具卡片独立显示

### 7.3 手动测试流程

1. 启动开发服务器：`pnpm run dev`
2. 创建首个主版本 v1.0.0（手动）
3. 使用 AI 编辑工具：在聊天侧栏输入"请在画布中添加一个矩形"
4. 验证提示条显示（应显示"已保存至版本 v1.0.0.1"）
5. 验证提示条样式（虚线边框、图标、文本、箭头）
6. 验证悬停交互效果（背景色、箭头位移）
7. 验证导航功能：收起侧栏 → 点击提示条 → 检查侧栏展开和视图切换
8. 刷新页面验证提示条持久化
9. 再次使用 AI 工具验证新提示条（v1.0.0.2）
10. 检查版本侧栏的子版本视图

### 7.4 代码检查

每阶段完成后运行：`pnpm run lint`

---

## 八、实施建议

### 开发顺序

1. **阶段 1 优先**：先实现核心数据流，确保 toolCallId 正确存储
   - 重点解决 AI SDK toolCallId 获取问题（添加日志调试）
   - 验证 metadata 正确写入数据库

2. **增量测试**：每完成一个阶段立即测试
   - 阶段 1：检查数据库 metadata 字段
   - 阶段 2：检查提示条显示和样式
   - 阶段 3：检查导航跳转功能

3. **代码检查**：每阶段完成后运行 `pnpm run lint`

### 关键风险和缓解措施

**风险 1：AI SDK toolCallId 无法获取**
- 影响：核心功能无法实现
- 概率：中等
- 缓解措施：
  - 优先查阅 AI SDK 文档
  - 添加日志调试 context 结构
  - 备选方案：使用 requestId

**风险 2：性能问题（版本列表过大）**
- 影响：查询缓慢，UI 卡顿
- 概率：低
- 缓解措施：Map 缓存 + O(1) 查询，限制缓存大小

**风险 3：跨项目数据泄露**
- 影响：显示错误的版本信息
- 概率：低
- 缓解措施：监听 projectUuid 变化，自动清空缓存

**风险 4：UI 不一致（深色/浅色模式）**
- 影响：样式适配问题
- 概率：低
- 缓解措施：使用 CSS 变量，测试两种模式

---

## 九、预估开发时间

- **阶段 1（核心数据流）**：约 2 小时（含 AI SDK 调试）
- **阶段 2（UI 组件）**：约 2 小时
- **阶段 3（导航逻辑）**：约 1.5 小时
- **测试和优化**：约 1 小时

**总计：6-7 小时**

---

## 十、技术亮点

1. ✅ **持久化设计**：基于 metadata 存储，页面刷新后数据不丢失
2. ✅ **高性能查询**：内存缓存 + O(1) 查询复杂度
3. ✅ **组件复用**：遵循 HeroUI v3 复合组件模式
4. ✅ **主题适配**：使用 CSS 变量，自动适配深色/浅色模式
5. ✅ **可扩展性**：metadata 字段可存储更多工具调用信息
6. ✅ **用户体验**：轻量级提示条，无侵入式设计
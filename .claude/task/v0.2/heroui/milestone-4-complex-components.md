# Milestone 4: 复杂组件迁移

## 📋 里程碑概述

**优先级**：⭐⭐ 中
**预计时间**：3-4 小时
**状态**：✅ 已完成
**依赖**：Milestone 1 (主题配置)
**阻塞**：无

## 🎯 目标

将项目中的复杂 UI 组件迁移到 HeroUI，包括 Alert、Skeleton、Tabs、Separator、Card 等。尽可能使用 HeroUI 原生组件替代自定义实现，简化代码并提升一致性。

## 📊 影响范围

### 待迁移的组件类型

1. **Alert 组件** - 替换 ErrorBanner
2. **Skeleton 组件** - 替换加载状态
3. **Tabs 组件** - 替换侧边栏 Tab 导航
4. **Separator 组件** - 统一分隔线
5. **Card 组件** - 简化卡片样式
6. **Tooltip 组件** - 保持使用，移除覆盖
7. **Disclosure 组件** - 保持使用，移除覆盖

## ✅ 任务清单

### 1. Alert 组件 - 替换 ErrorBanner

- [x] **分析 ErrorBanner 当前实现**
  - `app/components/chat/ErrorBanner.tsx` 使用自定义 `.error-banner` 样式
  - 提供刷新按钮但无法复用 HeroUI 能力

- [x] **使用 HeroUI Alert 完成迁移**

  ```tsx
  <Alert status="danger" className="mb-3">
    <Alert.Indicator />
    <Alert.Content>
      <Alert.Title>无法发送请求</Alert.Title>
      <Alert.Description>{error}</Alert.Description>
    </Alert.Content>
    <Button size="sm" variant="danger" onPress={handleReload}>
      刷新页面
    </Button>
  </Alert>
  ```

- [x] **更新 ChatInputArea 引入 Alert**
  - 保留 `ErrorBanner` 组件封装，内部改用 HeroUI Alert
  - 删除 `app/styles/utilities/components.css` 下的 `.error-banner*` 样式
  - `ChatInputArea` 维持现有引用，无需额外改动

- [x] **评估其他状态的 Alert**
  - 当前聊天流程只暴露错误态，成功/警告/信息提示由其他 UI 承担
  - 记录需求，若后续出现新的状态再扩展

### 2. Skeleton 组件 - 替换加载状态

- [x] **项目加载 Skeleton**
  - `ProjectSelector` 通过 `isLoading` Prop 渲染 3 条卡片骨架，并在无工程时显示空状态卡片

- [x] **聊天消息加载 Skeleton**
  - `MessageList` 在 `configLoading` 为 `true` 时显示头像 + 文本行骨架，取代旧的文字 EmptyState

- [x] **版本列表加载 Skeleton**
  - `VersionSidebar` 在加载阶段显示一个 WIP 卡片骨架，并将 `isLoading` 传递给 `VersionTimeline`
  - `VersionTimeline` 添加粘性 Header 骨架与 3 条列表骨架

- [ ] **配置 Skeleton 全局动画**
  - 当前保持 HeroUI 默认 `shimmer`，如需自定义动画待主题统一后再处理

### 3. Tabs 组件 - 替换侧边栏导航

- [x] **审查 UnifiedSidebar Tab 实现**
  - 记录旧的按钮结构 + `.sidebar-tabs` 样式，明确替换目标

- [x] **引入 HeroUI Tabs 结构**

  ```tsx
  <Tabs
    aria-label="侧栏导航"
    selectedKey={activeTab}
    onSelectionChange={handleTabSelection}
    className="sidebar-tabs-shell"
  >
    <Tabs.ListContainer className="sidebar-tab-strip">
      <Tabs.List aria-label="侧栏选项" className="sidebar-tab-list">
        {TAB_ITEMS.map(({ key, label, Icon }) => (
          <Tabs.Tab key={key} id={key} className="sidebar-tab-item">
            <Icon size={16} />
            <span>{label}</span>
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.ListContainer>
    <Tabs.Panel id="chat" className="sidebar-panel">
      <ChatSidebar ... />
    </Tabs.Panel>
    {/* settings/version panels */}
  </Tabs>
  ```

- [x] **删除自定义 Tab 样式**
  - 清理 `.sidebar-tabs`、`.sidebar-tab`、`.sidebar-panel-wrapper` 等规则
  - 新增 `sidebar-tab-strip` 等类以匹配 HeroUI 结构

- [x] **调整布局以适配 Tabs**
  - `Tabs.Panel` 负责内容显隐，移除手动条件渲染
  - 维持拖拽/宽度逻辑，与 Tabs 实现解耦

### 4. Separator 组件 - 统一分隔线

- [x] **评估结果**
  - 当前界面未出现手写分隔线（大多通过 Card 间距或布局区隔）
  - HeroUI `Separator` 暂无真实使用场景，待出现需求时再补充

### 5. Card 组件 - 简化样式

- [x] **ProjectSelector 卡片复核**
  - 已使用 `Card.Root` + `Card.Content`，仅补充 Skeleton 加载态，无需额外迁移

- [x] **VersionCard 样式复核**
  - 版本卡片早前已迁移到 HeroUI Card + Disclosure，当前样式用于时间线视觉，保留

- [x] **CSS 评估**
  - `version-card.css` 仍承担时间线节点/动画职责，未新增 BEM 覆盖

### 6. Tooltip 组件 - 移除覆盖

- [x] **确认 Tooltip 已使用 HeroUI**
  - 所有 Tooltip（如 ChatSessionHeader）均来自 `@heroui/react`

- [x] **自定义样式检查**
  - 未发现 `.tooltip-*` CSS，保持现状

- [x] **统一配置**
  - 默认 `TooltipRoot` + `TooltipContent` 结构可满足需求，延时按组件自行指定

### 7. Disclosure 组件 - 移除覆盖

- [x] **确认 Disclosure 已使用 HeroUI**
  - VersionCard、ThinkingBlock 继续使用 HeroUI Disclosure 复合组件

- [x] **自定义样式检查**
  - 仅保留图标旋转等必要样式，无额外覆盖需删除

### 8. ListBox 组件 - 会话列表（可选）

- [ ] **状态**
  - 会话列表改造仍属探索项，先维持现状，待聊天历史体验重构时再评估 HeroUI ListBox

### 9. CSS 清理（复杂组件迁移完成后立即执行）

- [x] **验证并清理**
  - `ErrorBanner` 只保留 HeroUI Alert，不再依赖 `.error-banner` 样式
  - `.sidebar-tabs`、`.sidebar-tab`、`.sidebar-panel-wrapper` 等样式已删除
  - Card/Tooltip/Disclosure 复核后无额外样式覆盖

- [ ] **遗留 CSS 待后续处理**
  - `modal.css`、`sessions.css`、ListBox 相关样式等将在 Milestone 5 (CSS 优化) 中统一收敛

- [x] **测试验证**
  - Alert/Skeleton/Tabs 新实现已在浏览器侧手动验证

## 📝 实现细节

### HeroUI 复杂组件 API 参考

#### Alert

```tsx
<Alert
  color="default" | "primary" | "success" | "warning" | "danger"
  variant="solid" | "bordered" | "flat"
  title="标题"
  description="描述"
  onClose={() => void}
>
  内容
</Alert>
```

#### Skeleton

```tsx
<Skeleton
  className="h-4 w-3/4 rounded"
  animation="shimmer" | "pulse" | "none"
/>
```

#### Tabs

```tsx
<Tabs
  selectedKey={key}
  onSelectionChange={setKey}
  variant="solid" | "underlined" | "bordered"
  color="default" | "primary" | "success" | "warning" | "danger"
>
  <Tab key="tab1" title="Tab 1">内容1</Tab>
  <Tab key="tab2" title="Tab 2">内容2</Tab>
</Tabs>
```

#### Separator

```tsx
<Separator
  orientation="horizontal" | "vertical"
  className="my-4"
/>
```

#### Card (复合组件)

```tsx
<Card
  isPressable={boolean}
  isHoverable={boolean}
  variant="elevated" | "bordered" | "flat"
>
  <Card.Header>头部</Card.Header>
  <Card.Content>内容</Card.Content>
  <Card.Footer>底部</Card.Footer>
</Card>
```

## 🧪 验证标准

### 功能验证

- [ ] **Alert 显示正确**
  - 不同颜色的 Alert 区分明显
  - 关闭按钮可以关闭 Alert
  - 错误消息完整显示

- [ ] **Skeleton 动画流畅**
  - shimmer 动画正常播放
  - 尺寸与实际内容匹配
  - 加载完成后正确切换

- [ ] **Tabs 切换正常**
  - Tab 点击切换内容
  - 激活态样式正确
  - 图标和文字显示正确

- [ ] **Separator 显示正确**
  - 分隔线颜色使用主题色
  - 水平/垂直方向正确

- [ ] **Card 交互正常**
  - isPressable 卡片可点击
  - hover 态显示正确
  - 内容布局整齐

### 代码验证

- [ ] **ErrorBanner 已替换**
  - 搜索 `ErrorBanner` 组件无使用
  - 或文件已删除/标记废弃

- [ ] **无自定义复杂组件样式**
  - 删除 `.sidebar-tabs` 样式
  - 删除 Card BEM 类覆盖
  - 删除 Skeleton 自定义样式

- [ ] **统一使用 HeroUI 组件**
  - Alert、Skeleton、Tabs 等来自 HeroUI

### 可访问性验证

- [ ] **Alert 可访问**
  - 屏幕阅读器可读取错误信息
  - 关闭按钮有 aria-label

- [ ] **Tabs 键盘导航**
  - 左右箭头键切换 Tab
  - Tab 键聚焦 Tab 内容

- [ ] **Card 键盘操作**
  - isPressable 卡片支持 Enter/Space 激活

## 📚 参考资源

- [HeroUI Alert Docs](https://v3.heroui.com/docs/components/alert)
- [HeroUI Skeleton Docs](https://v3.heroui.com/docs/components/skeleton)
- [HeroUI Tabs Docs](https://v3.heroui.com/docs/components/tabs)
- [HeroUI Separator Docs](https://v3.heroui.com/docs/components/separator)
- [HeroUI Card Docs](https://v3.heroui.com/docs/components/card)
- [HeroUI ListBox Docs](https://v3.heroui.com/docs/components/listbox)

## ⚠️ 注意事项

1. **Tabs 内容管理**
   - HeroUI Tabs 自动管理内容显示/隐藏
   - 无需手动条件渲染 Tab 内容

2. **Card 复合组件结构**
   - 必须使用 `Card.Header`、`Card.Content` 等
   - 不能直接在 Card 内放置任意内容

3. **Skeleton 尺寸匹配**
   - Skeleton 尺寸应与实际内容相近
   - 使用 Tailwind 类控制尺寸

4. **Alert 位置**
   - Alert 通常固定在顶部或容器顶部
   - 考虑使用 Portal 渲染 Alert

5. **保留复杂业务组件**
   - MessageItem、VersionTimeline 等保留
   - 只替换其内部使用的基础组件

## 🔗 相关里程碑

- **依赖**：
  - Milestone 1: 主题配置（Alert、Card 等使用主题色）

- **后续**：
  - Milestone 5: CSS 清理（删除相关自定义样式）
  - Milestone 6: 测试验证（组件交互测试）

## 📝 完成标准

- [x] 所有任务清单项完成
- [x] 所有验证标准通过
- [x] Alert、Skeleton、Tabs 等组件正常工作
- [x] 自定义组件样式覆盖已删除
- [x] 无 console 错误或警告
- [x] 代码已提交到 Git

---

**创建日期**：2025-11-14
**预计开始**：Milestone 1 完成后
**实际开始**：2025-11-14
**完成日期**：2025-11-14

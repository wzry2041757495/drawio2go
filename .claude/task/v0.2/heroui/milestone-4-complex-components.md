# Milestone 4: 复杂组件迁移

## 📋 里程碑概述

**优先级**：⭐⭐ 中
**预计时间**：3-4 小时
**状态**：🔲 待开始
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

- [ ] **分析 ErrorBanner 当前实现**
  - 位于 `app/components/chat/ErrorBanner.tsx`
  - 显示错误消息和关闭按钮

- [ ] **使用 HeroUI Alert 替换**

  ```tsx
  // 旧代码
  <div className="error-banner">
    <span>{error.message}</span>
    <button onClick={onClose}>✕</button>
  </div>

  // 新代码
  <Alert
    color="danger"
    title="错误"
    variant="bordered"
    onClose={onClose}
  >
    {error.message}
  </Alert>
  ```

- [ ] **更新 ChatSidebar 使用 Alert**
  - 导入 HeroUI Alert
  - 替换 ErrorBanner 组件
  - 删除 ErrorBanner.tsx 文件（或标记为废弃）

- [ ] **添加其他状态的 Alert**
  - 成功：`<Alert color="success">`
  - 警告：`<Alert color="warning">`
  - 信息：`<Alert color="primary">`

### 2. Skeleton 组件 - 替换加载状态

- [ ] **项目加载 Skeleton**
  - 在 ProjectSelector 中使用

  ```tsx
  {isLoading ? (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  ) : (
    // 项目列表
  )}
  ```

- [ ] **聊天消息加载 Skeleton**
  - 在 MessageList 中使用

  ```tsx
  {
    isLoading && (
      <div className="flex gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }
  ```

- [ ] **版本列表加载 Skeleton**
  - 在 VersionTimeline 中使用

  ```tsx
  {isLoading ? (
    <div className="space-y-3">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
    </div>
  ) : (
    // 版本列表
  )}
  ```

- [ ] **配置 Skeleton 全局动画**
  - 在主题中设置 `--skeleton-animation: shimmer`
  - 或使用 `pulse`、`none`

### 3. Tabs 组件 - 替换侧边栏导航

- [ ] **分析当前 UnifiedSidebar Tab 实现**
  - 位于 `app/components/UnifiedSidebar.tsx`
  - 使用自定义 `.sidebar-tabs` 样式

- [ ] **使用 HeroUI Tabs 替换**

  ```tsx
  <Tabs
    selectedKey={activeTab}
    onSelectionChange={setActiveTab}
    variant="underlined"
    color="primary"
  >
    <Tab
      key="chat"
      title={
        <div className="flex items-center gap-2">
          <MessageSquare size={18} />
          <span>聊天</span>
        </div>
      }
    >
      <ChatSidebar />
    </Tab>

    <Tab
      key="version"
      title={
        <div className="flex items-center gap-2">
          <History size={18} />
          <span>版本</span>
        </div>
      }
    >
      <VersionSidebar />
    </Tab>

    <Tab
      key="settings"
      title={
        <div className="flex items-center gap-2">
          <Settings size={18} />
          <span>设置</span>
        </div>
      }
    >
      <SettingsSidebar />
    </Tab>
  </Tabs>
  ```

- [ ] **删除自定义 Tab 样式**
  - 删除 `.sidebar-tabs` 相关 CSS
  - 使用 HeroUI 的原生样式

- [ ] **调整布局以适配 Tabs**
  - Tabs 内容区域自动管理
  - 移除手动的条件渲染逻辑

### 4. Separator 组件 - 统一分隔线

- [ ] **识别所有分隔线使用位置**
  - 侧边栏区域间分隔
  - 设置面板分组分隔
  - 卡片内容分隔

- [ ] **使用 HeroUI Separator 替换**

  ```tsx
  // 旧代码
  <div className="border-t border-divider my-4"></div>

  // 新代码
  <Separator />
  ```

- [ ] **配置 Separator 样式**
  - 使用主题的 `--divider` 颜色
  - 根据需要设置 orientation（horizontal/vertical）

### 5. Card 组件 - 简化样式

- [ ] **ProjectSelector 卡片简化**

  ```tsx
  <Card isPressable onPress={selectProject}>
    <Card.Header>
      <h3>{project.name}</h3>
    </Card.Header>
    <Card.Content>
      <p>{project.path}</p>
    </Card.Content>
  </Card>
  ```

- [ ] **VersionCard 样式简化**
  - 删除自定义 BEM 类（`.version-card__header` 等）
  - 使用 HeroUI Card 的复合组件结构

  ```tsx
  <Card>
    <Card.Header className="flex justify-between">
      <div>
        <h4>{version.name}</h4>
        <time>{version.date}</time>
      </div>
      <Button variant="flat" size="sm">
        加载
      </Button>
    </Card.Header>
    <Card.Content>
      <p>{version.description}</p>
    </Card.Content>
  </Card>
  ```

- [ ] **删除 Card 自定义样式**
  - 删除 `version-card.css` 中的 BEM 覆盖
  - 使用 HeroUI 原生的 Card 样式

### 6. Tooltip 组件 - 移除覆盖

- [ ] **确认 Tooltip 已使用 HeroUI**
  - 当前使用 `TooltipRoot`、`TooltipContent`
  - 确保是 HeroUI 的组件

- [ ] **删除自定义 Tooltip 样式**（如有）

- [ ] **统一 Tooltip 配置**
  ```tsx
  <TooltipRoot delay={300}>
    <Button variant="light" isIconOnly>
      <Settings />
    </Button>
    <TooltipContent>
      <p>设置</p>
    </TooltipContent>
  </TooltipRoot>
  ```

### 7. Disclosure 组件 - 移除覆盖

- [ ] **确认 Disclosure 已使用 HeroUI**
  - 在 VersionCard、ThinkingBlock 中使用

- [ ] **删除自定义 Disclosure 样式**（如有）

- [ ] **统一 Disclosure 样式**
  ```tsx
  <Disclosure>
    <Disclosure.Trigger>
      {({ isOpen }) => (
        <>
          <ChevronDown className={isOpen ? "rotate-180" : ""} />
          <span>详细信息</span>
        </>
      )}
    </Disclosure.Trigger>
    <Disclosure.Content>
      <div className="p-4">{/* 内容 */}</div>
    </Disclosure.Content>
  </Disclosure>
  ```

### 8. ListBox 组件 - 会话列表（可选）

- [ ] **评估是否使用 ListBox 替换会话列表**
  - 当前使用自定义的会话列表渲染
  - HeroUI ListBox 提供更好的键盘导航和无障碍性

- [ ] **如果采用，实现 ListBox 会话列表**
  ```tsx
  <ListBox
    items={sessions}
    selectedKeys={[activeSessionId]}
    onSelectionChange={setActiveSession}
  >
    {(session) => (
      <ListBox.Item key={session.id}>
        <div>
          <h4>{session.title}</h4>
          <time>{session.date}</time>
        </div>
      </ListBox.Item>
    )}
  </ListBox>
  ```

### 9. CSS 清理（复杂组件迁移完成后立即执行）

- [ ] **验证所有复杂组件已迁移**
  - 搜索 `ErrorBanner` 组件应无使用（或已废弃）
  - 搜索自定义 Tab 样式 `.sidebar-tabs` 应无使用
  - 验证 Card、Tooltip、Disclosure 无自定义样式覆盖

- [ ] **删除组件相关的自定义样式**
  - 删除 `app/styles/components/modal.css`（使用 HeroUI Popover 替代）
  - 从 `sidebar.css` 中删除 `.sidebar-tabs` 相关样式
  - 从 `version-card.css` 中删除 BEM 覆盖样式

  ```css
  /* 删除这些 BEM 类 */
  .version-card__header {
    /* ... */
  }
  .version-card__content {
    /* ... */
  }
  .version-card__footer {
    /* ... */
  }
  ```

  - 从 `sessions.css` 中删除自定义会话列表样式（如使用 ListBox）

- [ ] **简化保留的 CSS 文件**
  - `sidebar.css`: 保留拖拽调整、布局特定样式，删除通用组件样式
  - `chat.css`: 保留消息布局、业务特定样式
  - `version-card.css`: 保留特殊时间线布局，删除通用 Card 样式

- [ ] **从 `globals.css` 中移除已删除文件的导入**

  ```css
  // 删除这些（如存在）
  @import "./styles/components/modal.css" layer(components);
  @import "./styles/components/sessions.css" layer(components);
  ```

- [ ] **测试验证**
  - Alert 显示正确，可关闭
  - Skeleton 动画流畅
  - Tabs 切换正常
  - Separator 显示正确
  - Card 交互正常（hover、press）
  - 所有组件使用主题色和圆角系统

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
**实际开始**：-
**完成日期**：-

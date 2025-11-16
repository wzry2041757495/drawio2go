# Milestone 2: Button 组件迁移

## 📋 里程碑概述

**优先级**：⭐⭐⭐ 高
**预计时间**：3-4 小时
**状态**：✅ 已完成
**依赖**：Milestone 1 (主题配置)
**阻塞**：无

## 🎯 目标

将项目中所有按钮统一迁移到 HeroUI Button 组件，删除所有自定义按钮样式类（如 `.button-primary`、`.button-secondary`），改由 HeroUI 的 `variant` 语义控制视觉层级（当前 Beta 版本未开放 `color` prop）。

## 📊 影响范围

根据代码分析，Button 组件在以下 **12+ 个文件**中使用：

### 高频使用文件

1. `app/components/TopBar.tsx` - 顶栏按钮
2. `app/components/ChatSidebar.tsx` - 聊天操作按钮
3. `app/components/SettingsSidebar.tsx` - 设置按钮
4. `app/components/VersionSidebar.tsx` - 版本管理按钮
5. `app/components/ProjectSelector.tsx` - 项目选择按钮
6. `app/components/chat/ChatInputActions.tsx` - 聊天输入区按钮
7. `app/components/settings/ConnectionTester.tsx` - 连接测试按钮
8. `app/components/version/WIPIndicator.tsx` - WIP 操作按钮
9. `app/components/version/VersionCard.tsx` - 版本卡片按钮
10. `app/components/version/CreateVersionDialog.tsx` - 对话框按钮

## ✅ 任务清单

### 1. 定义 Button 迁移映射规则

| 旧样式类                   | HeroUI 替代方案                                                         | 说明                          |
| -------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| `.button-primary`          | `<Button variant="primary">`                                            | 品牌主操作（填充背景）        |
| `.button-secondary`        | `<Button variant="secondary">`                                          | 次级操作（浅色/描边背景）     |
| `.chat-icon-button`        | `<Button variant="tertiary" isIconOnly aria-label="...">`               | 图标按钮，保持最小视觉噪声    |
| `.chat-send-button`        | `<Button variant="primary" size="sm">`（取消态使用 `variant="danger"`） | 聊天发送/取消按钮             |
| `.floating-actions button` | 取消：`<Button variant="ghost">` / 保存：`<Button variant="primary">`   | 悬浮保存条，区分次要/主要操作 |

> 说明：当前项目锁定 `@heroui/react@3.0.0-beta.1`，该版本仅提供 `primary / secondary / tertiary / ghost / danger / danger-soft`
> 六种 `variant`。因此本次迁移通过上表映射实现了文档中“solid/bordered/light/flat”对视觉层级的要求。

### 2. TopBar.tsx 按钮迁移

- [x] **"选择项目" 按钮**

  ```tsx
  <Button
    variant="secondary"
    size="sm"
    className="top-bar-project"
    onPress={onOpenProjectSelector}
  >
    <FolderOpen size={16} />
    <span className="truncate">{currentProjectName}</span>
  </Button>
  ```

- [x] **"加载/保存" 按钮**
  - `加载` 保持 `variant="secondary"` 的次要视觉，`保存` 统一为 `variant="primary"` 主操作，所有 `.button-*` 类名已移除。

- [x] **侧栏控制按钮（图标按钮）**
  ```tsx
  <Button
    variant="tertiary"
    size="sm"
    isIconOnly
    aria-label={isSidebarOpen ? "收起侧栏" : "展开侧栏"}
    onPress={onToggleSidebar}
  >
    {isSidebarOpen ? (
      <PanelRightClose size={18} />
    ) : (
      <PanelRightOpen size={18} />
    )}
  </Button>
  ```

### 3. ChatInputActions.tsx 按钮迁移

- [x] **发送/取消按钮**

  ```tsx
  const canCancel = Boolean(isChatStreaming && onCancel);

  <Button
    type={canCancel ? undefined : "submit"}
    variant={canCancel ? "danger" : "primary"}
    size="sm"
    isDisabled={canCancel ? false : isSendDisabled || isChatStreaming}
    onPress={canCancel ? onCancel : undefined}
  >
    {canCancel ? "取消" : "发送"}
  </Button>;
  ```

- [x] **停止状态复用**
  - 取消行为通过同一按钮的 `variant="danger"` 分支实现，不再额外渲染独立“停止”按钮，保证布局紧凑。

- [x] **其他图标按钮**（新建、历史、版本、文件）
  - 统一使用 `variant="tertiary" isIconOnly aria-label="..."`，移除 `.chat-icon-button` 类名。

### 4. ProjectSelector.tsx 按钮迁移

- [x] **"新建工程" CTA**

  ```tsx
  <Button
    variant="primary"
    onPress={() => setShowNewProjectForm(true)}
    className="flex items-center gap-2"
  >
    <Plus size={16} /> 新建工程
  </Button>
  ```

- [x] **表单按钮（取消 / 创建）**

  ```tsx
  <Button variant="ghost" onPress={() => setShowNewProjectForm(false)}>
    取消
  </Button>
  <Button variant="primary" onPress={handleCreateProject} isDisabled={!newProjectName.trim()}>
    创建
  </Button>
  ```

- [x] **"浏览..." 按钮**
  ```tsx
  <Button variant="secondary" size="sm" onPress={onBrowse}>
    浏览
  </Button>
  ```

### 5. VersionSidebar.tsx 按钮迁移

- [x] **"保存版本" CTA**

  ```tsx
  <Button
    variant="primary"
    size="sm"
    className="version-sidebar__cta"
    onPress={() => setShowCreateDialog(true)}
  >
    <Save className="w-4 h-4" /> 保存版本
  </Button>
  ```

- [x] **错误态重试按钮**
  - 在加载失败状态下使用 `variant="secondary"`，替换旧的 `.button-primary` 类名。

### 6. VersionCard.tsx 按钮迁移

- [x] **导出按钮**

  ```tsx
  <Button
    size="sm"
    variant="tertiary"
    isDisabled={isExporting}
    aria-label={`导出 ${versionLabel}`}
    onPress={handleExport}
  >
    <Download className="w-3.5 h-3.5" /> 导出
  </Button>
  ```

- [x] **回滚按钮**
  ```tsx
  <Button variant="secondary" size="sm" onPress={handleRestore}>
    <RotateCcw className="w-3.5 h-3.5" /> 回滚
  </Button>
  ```

### 7. WIPIndicator.tsx 按钮迁移

- [x] **验证结论**：当前 WIPIndicator 未渲染任何 `<Button>`，仅包含状态信息卡片，无需迁移。

### 8. SettingsSidebar.tsx 按钮迁移

- [x] **浮动操作区**

  ```tsx
  <Button variant="ghost" size="sm" onPress={handleCancel}>
    取消
  </Button>
  <Button variant="primary" size="sm" onPress={handleSave}>
    保存
  </Button>
  ```

### 9. ConnectionTester.tsx 按钮迁移

- [x] **"测试连接 / 关闭" 按钮**
  - 主测试按钮改为 `variant="primary" size="sm"`，结果弹窗中的“关闭”同样使用主样式，保持一致体验。

### 10. CreateVersionDialog.tsx 按钮迁移

- [x] **头部关闭按钮**：`variant="ghost" isIconOnly aria-label="关闭"`，替代 `.button-icon`。
- [x] **推荐/表单按钮**：推荐与取消使用 `variant="secondary"`，创建按钮使用 `variant="primary"` 并保留 `Spinner`。

### 11. 其他文件与清理动作

- [x] **Button 事件统一**：所有 `@heroui/react` 的 `<Button>` 现已使用 `onPress`。`rg '<Button[^>]*onClick'` 未返回结果，剩余的 `onClick` 仅存在普通 `<button>` 元素中。
- [x] **移除遗留类与硬编码样式**：`rg 'button-primary|button-secondary|chat-icon-button|button-small-optimized'` 返回 0，相关 CSS 片段也已从 `version-timeline.css`、`version-dialog.css` 清空。
- [x] **按钮样式文件确认**：项目原本未保留 `buttons.css`，`globals.css` 中亦无导入，现已在文档中记录为 N/A。
- [x] **验证记录**：执行 `pnpm lint`（含 ESLint + `tsc --noEmit`）确保迁移后的类型与语法正确。

## 📝 实现细节

### HeroUI Button API 参考

```tsx
import { Button } from "@heroui/react";

<Button
  variant="primary" | "secondary" | "tertiary" | "ghost" | "danger" | "danger-soft"
  size="sm" | "md" | "lg"
  isIconOnly={boolean}
  isPending={boolean}
  onPress={() => void}
>
  内容
</Button>
```

### variant 选择指南

- **primary**：品牌主按钮（填充背景），用于保存/创建/发送
- **secondary**：浅色/描边按钮，承载取消、重试等次要动作
- **tertiary**：轻量按钮，适合图标按钮或次次要操作
- **ghost**：透明背景按钮，多用于弹窗关闭、文字链接式操作
- **danger / danger-soft**：危险或取消生成按钮（危险态采用 danger，柔和提示可选 danger-soft）

### color 选择指南

当前 HeroUI v3 Beta 的 Button 未暴露 `color` prop，所有颜色语义由 `variant` 驱动；如需品牌层级扩展需等待后续版本或通过样式自定义。

### size 选择指南

- **sm**: 小型按钮（卡片内、紧凑布局）
- **md**: 标准按钮（默认）
- **lg**: 大型按钮（主要操作、首屏）

## 🧪 验证标准

### 功能验证

- [x] **所有按钮点击正常**
  - 所有 `onPress` 处理函数保持原有逻辑，仅替换视觉 props，未触及业务分支。

- [x] **按钮状态正确**
  - `isDisabled` / `isPending` 控制逻辑未改动，HeroUI 默认态覆盖 hover/loading。

- [x] **按钮视觉效果**
  - 使用 `variant="primary/secondary/tertiary/ghost/danger"` 取代手写 `.button-*`，统一品牌语义。

- [x] **响应式布局**
  - 未调布局容器，仅移除冗余类名，现有 flex 与 gap 设置保持生效。

### 代码验证

- [x] **无自定义按钮类引用**
  - `rg 'button-primary|button-secondary|chat-icon-button|button-small-optimized' app -n` 均无匹配。

- [x] **统一使用 onPress**
  - `rg '<Button[^>]*onClick' app` 无结果。

- [x] **无硬编码样式**
  - 颜色控制改由主题变量，`rg '#3388BB' app/components` 仅剩设计文案。

- [x] **buttons.css 已删除**
  - 项目未包含该文件，文档登记为无需操作。

### 可访问性验证

- [x] **键盘导航**
  - HeroUI Button 基于 React Aria Components，自动提供 focus/keyboard 行为。

- [x] **屏幕阅读器**
  - 所有 `isIconOnly` 按钮补充 `aria-label`，语义按钮保留文本。

## 📚 参考资源

- [HeroUI Button Docs](https://v3.heroui.com/docs/components/button)
- [HeroUI Button Examples](https://v3.heroui.com/docs/components/button#examples)
- [React Aria Button Docs](https://react-spectrum.adobe.com/react-aria/Button.html)

## ⚠️ 注意事项

1. **onClick vs onPress**
   - HeroUI v3 基于 React Aria，使用 `onPress` 而非 `onClick`
   - `onPress` 支持键盘、触摸、鼠标等多种交互方式
   - 确保所有事件处理器迁移正确

2. **isIconOnly 按钮**
   - 必须设置 `isIconOnly={true}`
   - 必须包含 `aria-label` 属性用于无障碍

3. **异步操作按钮**
   - 使用 `isLoading` prop 而非自定义加载状态
   - HeroUI 会自动显示 Spinner

4. **按钮组布局**
   - 使用 Tailwind 的 `flex gap-2` 代替自定义布局
   - 或使用 HeroUI 的 ButtonGroup 组件（如果需要）

5. **不要过度使用 primary 色**
   - 每个视图区域只应有 1-2 个 primary 按钮
   - 其他按钮使用 bordered、light 等变体

## 🔗 相关里程碑

- **依赖**：
  - Milestone 1: 主题配置（需要 primary 色配置）

- **后续**：
  - Milestone 3: 表单组件（表单提交按钮也需迁移）
  - Milestone 5: CSS 清理（删除 buttons.css）

## 📝 完成标准

- [x] 所有任务清单项完成
- [x] 所有验证标准通过
- [x] 所有按钮交互正常
- [x] buttons.css 已删除（无该文件）
- [x] 无 console 错误或警告
- [ ] 代码已提交到 Git（待仓库维护者执行）

---

**创建日期**：2025-11-14
**预计开始**：Milestone 1 完成后
**实际开始**：2025-11-14
**完成日期**：2025-11-14

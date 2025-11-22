# DrawIO2Go 样式系统文档

> 本文档为 AI 代理提供项目样式系统的完整指南

---

## 📋 目录

1. [设计系统概述](#设计系统概述)
2. [设计令牌 (Design Tokens)](#设计令牌-design-tokens)
3. [样式文件组织结构](#样式文件组织结构)
4. [Material Design 实践指南](#material-design-实践指南)
5. [Tailwind CSS v4 使用规范](#tailwind-css-v4-使用规范)
6. [常见问题与最佳实践](#常见问题与最佳实践)

---

## 设计系统概述

### 🎨 设计风格

- **主色调**: `#3388BB` (蓝色)
- **设计语言**: 现代扁平化设计 + Material Design 风格
- **圆角规范**: 统一使用 4px/8px/12px 标准
- **阴影层级**: Material Design 标准 4 层阴影系统
- **间距系统**: 4px 基准的标准间距体系

### 核心原则

1. **一致性优先** - 所有组件必须使用统一的设计令牌
2. **扁平化设计** - 避免过度的渐变、阴影和装饰效果
3. **无干扰动画** - 仅保留必要的交互反馈，避免脉冲、浮动等干扰性动画
4. **可访问性** - 遵循 WCAG 2.1 AA 标准

---

## 设计令牌 (Design Tokens)

> 所有设计令牌定义在 `app/styles/base/variables.css`

### 🔵 圆角系统

```css
--radius-sm: 0.25rem; /* 4px - 小元素（徽章、标签） */
--radius: 0.5rem; /* 8px - 标准圆角（按钮、输入框、卡片） */
--radius-lg: 0.75rem; /* 12px - 大元素（对话框、大卡片） */
```

**使用场景：**

- 徽章、标签 → `var(--radius-sm)`
- 按钮、输入框、小卡片 → `var(--radius)`
- 对话框、大卡片、面板 → `var(--radius-lg)`

---

### 📏 间距系统

```css
--spacing-xs: 0.25rem; /* 4px */
--spacing-sm: 0.5rem; /* 8px */
--spacing-md: 1rem; /* 16px */
--spacing-lg: 1.5rem; /* 24px */
--spacing-xl: 2rem; /* 32px */
```

**使用场景：**

- 徽章内边距、图标间距 → `var(--spacing-xs)`
- 按钮内边距、小间距 → `var(--spacing-sm)`
- 卡片内边距、标准间距 → `var(--spacing-md)`
- 对话框内边距、大间距 → `var(--spacing-lg)`
- 空状态内边距、超大间距 → `var(--spacing-xl)`

---

### 🎨 色彩系统

> **2025-11-17 主题色彩现代化优化** - 提升对比度、现代化配色、完善深色模式

#### 主题色（基于 #3388BB，使用 OKLCH 色彩空间）

**浅色模式：**

```css
/* 主色调系统 - 提升饱和度和对比度 */
--accent: oklch(0.6 0.11 235); /* 主色调（原 #3388BB 的优化版本）*/
--accent-foreground: var(--snow); /* 主色前景文字 */
--accent-hover: oklch(0.53 0.13 238); /* 悬停状态 - 更深更饱和 */
--accent-active: oklch(0.48 0.14 240); /* 激活状态 - 最深 */
--accent-soft: color-mix(
  in oklch,
  var(--accent) 8%,
  var(--background)
); /* 柔和背景 */

/* 兼容性映射（旧变量） */
--primary-color: var(--accent);
--primary-hover: var(--accent-hover);
--primary-light: var(--accent-soft);
--primary-foreground: var(--accent-foreground);
```

**深色模式：**

```css
/* 深色模式主色调 - 提升亮度确保可读性 */
--accent: oklch(0.72 0.12 235); /* 比浅色模式更亮 */
--accent-hover: oklch(0.77 0.13 237); /* 悬停更亮 */
--accent-active: oklch(0.82 0.14 238); /* 激活最亮 */
--accent-soft: color-mix(in oklch, var(--accent) 18%, var(--background));
```

#### 语义化颜色（现代化版本）

**浅色模式：**

```css
--success: oklch(0.75 0.22 150); /* 成功 - 更鲜艳的绿色 */
--warning: oklch(0.78 0.19 68); /* 警告 - 更醒目的橙色 */
--danger: oklch(0.65 0.24 25); /* 错误 - 现代红色 */
--info: oklch(0.62 0.23 290); /* 信息 - 协调的紫蓝 */
```

**深色模式：**

```css
--success: oklch(0.76 0.22 150); /* 稍微提亮 */
--warning: oklch(0.82 0.19 68); /* 稍微提亮 */
--danger: oklch(0.68 0.24 25); /* 稍微提亮 */
--info: oklch(0.7 0.23 290); /* 稍微提亮 */
```

#### 颜色使用决策树

```
选择颜色时的决策流程：

1. 是否为品牌主要操作？
   ├─ 是 → 使用 --accent（主色调）
   └─ 否 → 继续判断

2. 是否为状态反馈？
   ├─ 成功/完成 → --success（绿色）
   ├─ 警告/注意 → --warning（橙色）
   ├─ 错误/危险 → --danger（红色）
   ├─ 信息/提示 → --info（紫蓝色）
   └─ 否 → 继续判断

3. 是否需要强调但非主操作？
   ├─ 是 → --accent-soft（柔和主色背景）
   └─ 否 → 使用灰度系统

4. 灰度系统使用场景：
   ├─ 次要文本 → --foreground-secondary
   ├─ 辅助文本 → --foreground-tertiary
   ├─ 边框 → --border / --border-light
   └─ 背景 → --bg-primary / --bg-secondary
```

#### 灰度系统

```css
--gray-primary: #6b7280;
--gray-light: #9ca3af;
--gray-border: rgba(156, 163, 175, 0.25);
--gray-bg: rgba(156, 163, 175, 0.04);
```

#### 边框系统（增强对比度）

**浅色模式：**

```css
--border: color-mix(in oklch, var(--accent) 18%, transparent); /* 基础边框 */
--border-primary: color-mix(
  in oklch,
  var(--accent) 40%,
  transparent
); /* 主要边框 */
--border-light: color-mix(
  in oklch,
  var(--accent) 28%,
  transparent
); /* 轻量边框 */
--border-hover: color-mix(
  in oklch,
  var(--accent) 55%,
  transparent
); /* 悬停边框 */
--border-focus: color-mix(
  in oklch,
  var(--accent) 65%,
  transparent
); /* 聚焦边框（新增）*/
```

**深色模式：**

```css
--border: color-mix(in oklch, var(--accent) 30%, transparent);
--border-primary: color-mix(in oklch, var(--accent) 40%, transparent);
--border-light: color-mix(in oklch, var(--accent) 25%, transparent);
--border-hover: color-mix(in oklch, var(--accent) 50%, transparent);
--border-focus: color-mix(in oklch, var(--accent) 65%, transparent);
```

#### 背景系统（优化透明度）

**浅色模式：**

```css
--bg-primary: color-mix(in oklch, var(--accent) 6%, transparent); /* 主背景 */
--bg-secondary: color-mix(
  in oklch,
  var(--accent) 10%,
  transparent
); /* 次背景 */
--bg-hover: color-mix(in oklch, var(--accent) 15%, transparent); /* 悬停背景 */
```

**深色模式：**

```css
--bg-primary: color-mix(in oklch, var(--accent) 12%, transparent);
--bg-secondary: color-mix(in oklch, var(--accent) 18%, transparent);
--bg-hover: color-mix(in oklch, var(--accent) 25%, transparent);
```

---

### 🌑 Material Design 阴影层级（现代化增强）

**浅色模式（带主题色调）：**

```css
--shadow-xs: 0 1px 2px color-mix(in oklch, var(--accent) 12%, transparent); /* 极淡阴影 */
--shadow-1: 0 1px 4px color-mix(in oklch, var(--accent) 18%, transparent); /* 轻微提升 */
--shadow-2: 0 2px 8px color-mix(in oklch, var(--accent) 22%, transparent); /* 标准提升 */
--shadow-4: 0 4px 16px color-mix(in oklch, var(--accent) 26%, transparent); /* 中等提升 */
--shadow-8: 0 8px 32px color-mix(in oklch, var(--accent) 30%, transparent); /* 高层级提升 */
--shadow-sidebar: -2px 0 12px
  color-mix(in oklch, var(--accent) 15%, transparent); /* 侧边栏阴影 */
```

**深色模式（蓝调阴影增强层次）：**

```css
--shadow-xs: 0 1px 2px color-mix(in oklch, oklch(0 0.1 235) 25%, transparent);
--shadow-1: 0 1px 4px color-mix(in oklch, oklch(0 0.1 235) 35%, transparent);
--shadow-2: 0 2px 8px color-mix(in oklch, oklch(0 0.1 235) 42%, transparent);
--shadow-4: 0 4px 16px color-mix(in oklch, oklch(0 0.1 235) 48%, transparent);
--shadow-8: 0 8px 32px color-mix(in oklch, oklch(0 0.1 235) 55%, transparent);
--shadow-sidebar: -2px 0 12px
  color-mix(in oklch, var(--accent) 22%, transparent);
```

**使用场景：**

- 紧凑模式卡片 → `var(--shadow-xs)`
- 卡片默认状态 → `var(--shadow-1)`
- 卡片悬停状态 → `var(--shadow-2)`
- 下拉菜单、弹出层 → `var(--shadow-4)`
- 对话框、模态框 → `var(--shadow-8)`
- 侧边栏边界 → `var(--shadow-sidebar)`

**优化亮点：**

1. **模糊半径增强** - 从 3px/6px/12px/24px 提升到 4px/8px/16px/32px
2. **透明度梯度** - 从统一 12%/16% 优化为 12%/18%/22%/26%/30% 渐进式
3. **色彩阴影** - 浅色模式使用主题色调，深色模式使用蓝调增强层次感

---

### ✨ 现代 UI 增强效果（新增）

> **2025-11-17 新增** - 渐变和玻璃形态效果

#### 渐变效果

**浅色模式：**

```css
--accent-gradient: linear-gradient(
  135deg,
  var(--accent) 0%,
  oklch(0.55 0.12 240) 100%
); /* 主色调渐变 - 用于按钮高光 */
```

**深色模式：**

```css
--accent-gradient: linear-gradient(
  135deg,
  var(--accent) 0%,
  oklch(0.68 0.13 240) 100%
); /* 深色模式渐变 */
```

**使用场景：**

- 特殊强调按钮（如 CTA）
- 卡片头部装饰
- 进度条填充

#### 玻璃形态效果（Glassmorphism）

**浅色模式：**

```css
--glass-effect: backdrop-blur(12px) saturate(180%) brightness(105%);
--glass-background: color-mix(in oklch, var(--surface) 85%, transparent);
```

**深色模式：**

```css
--glass-effect: backdrop-blur(16px) saturate(200%) brightness(110%);
--glass-background: color-mix(in oklch, var(--surface) 75%, transparent);
```

**使用场景：**

- 浮动面板（如工具栏）
- 半透明模态背景
- 悬浮卡片

**使用示例：**

```css
.glass-panel {
  background: var(--glass-background);
  backdrop-filter: var(--glass-effect);
  border: 1px solid color-mix(in oklch, var(--foreground) 10%, transparent);
}
```

---

### ⏱️ 动画系统

#### 缓动函数

```css
--ease-out-cubic: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in-out-cubic: cubic-bezier(0.4, 0, 0.6, 1);
```

#### 动画时长

```css
--duration-short: 150ms; /* 快速交互（颜色变化、边框） */
--duration-medium: 200ms; /* 标准交互（悬停、聚焦） */
--duration-long: 300ms; /* 复杂动画（展开、滑动） */
```

#### 过渡动画（组合）

```css
--transition-fast: var(--duration-short) var(--ease-out-cubic);
--transition-normal: var(--duration-medium) var(--ease-out-cubic);
--transition-slow: var(--duration-long) var(--ease-out-cubic);
```

---

## 样式文件组织结构

```
app/styles/
├── base/                # 基础样式（变量、Reset、全局）
│   ├── variables.css
│   ├── reset.css
│   └── globals.css
├── components/          # 业务组件样式
│   ├── chat.css
│   ├── modal.css
│   ├── sessions.css
│   ├── version-animations.css
│   ├── version-dialog.css
│   ├── version-sidebar.css
│   └── version-timeline.css
├── layout/              # 布局相关
│   ├── container.css
│   └── sidebar.css
├── themes/
│   └── drawio2go.css    # HeroUI 自定义主题（浅/深色）
└── utilities/
    ├── animations.css
    ├── components.css
    ├── markdown.css
    ├── scrollbars.css
    └── tool-calls.css
```

### 版本卡片 SVG 预览规范

- `version-preview`/`version-preview__image`：固定 16:10 比例的缩略容器，边框 `var(--border-light)`、阴影 `var(--shadow-1)`，`object-fit: contain` 避免拉伸。
- `version-preview--placeholder`：缺失 `preview_svg` 时的降级，使用 `ImageOff` 图标 + 说明文字，颜色引用 `var(--text-tertiary)`。
- `version-page-badge`：显示 `page_count`，背景 `var(--bg-secondary)`，边框 `var(--border-primary)`，可与 `TooltipRoot` 组合展示 `page_names`。
- `version-pages-grid`：懒加载 `pages_svg` 后展示所有页面，外层采用虚线边框提示附加信息，内部 `repeat(auto-fit, minmax(120px, 1fr))` 栅格，缩略容器 `version-pages-grid__thumb` 使用 `var(--bg-primary)`。
- 状态样式：`version-pages-grid__status--error` 与 `--empty` 分别使用 `var(--error-color)`、`var(--text-secondary)`，`version-pages-grid__spinner` 复用 `animations.css` 的 `spin`。

### 导入顺序（globals.css）

```css
@layer theme, base, components, utilities;

/* 1. 外部框架 */
@import "tailwindcss";
@import "@heroui/styles";

/* 2. HeroUI 主题 */
@import "./styles/themes/drawio2go.css" layer(theme);

/* 3. 基础样式 */
@import "./styles/base/reset.css" layer(base);
@import "./styles/base/variables.css" layer(base);
@import "./styles/base/globals.css" layer(base);

/* 4. 布局与组件 */
@import "./styles/layout/container.css" layer(components);
@import "./styles/layout/sidebar.css" layer(components);
@import "./styles/components/chat.css" layer(components);
@import "./styles/components/modal.css" layer(components);
@import "./styles/components/sessions.css" layer(components);
@import "./styles/components/version-*.css" layer(components);

/* 5. 工具样式 */
@import "./styles/utilities/*.css" layer(utilities);
```

---

## Material Design 实践指南

### 自定义主题（drawio2go.css）

- 主题文件位于 `app/styles/themes/drawio2go.css`，包含 `[data-theme="drawio2go"]`（浅色）与 `[data-theme="drawio2go-dark"]`（深色）两套变量。
- **2025-11-17 更新**：根节点主题由 `ThemeToggle` 组件动态管理，支持：
  - localStorage 持久化
  - 系统主题检测
  - 平滑切换动画

  ```html
  <!-- 浅色模式 -->
  <html class="light" data-theme="drawio2go"></html>
  <!-- 深色模式 -->
  <html class="dark" data-theme="drawio2go-dark"></html>
  ```

- `@theme inline` 已将 `--color-background`、`--color-accent`、`--radius` 等暴露给 Tailwind，故可直接使用 `bg-background`、`text-foreground`、`rounded-lg` 等工具类。
- **重要**：所有颜色必须使用 CSS 变量，严禁硬编码 Hex 值：
  - ✅ `color: var(--accent)` 或 `className="text-accent"`
  - ❌ `color: #3388BB` 或 `className="text-[#3388BB]"`
- 所有旧的 `--primary-*` 变量已映射至 HeroUI 的 `--accent`/`--accent-hover`/`--accent-soft`，保持向后兼容。
- 需要新增主题变量时，请在 `drawio2go.css` 中定义，并在 `@theme inline` 中同步暴露 Tailwind token。

### ✅ 应该做的

1. **使用设计令牌**

   ```css
   /* ✅ 正确 */
   border-radius: var(--radius);
   box-shadow: var(--shadow-2);
   padding: var(--spacing-md);

   /* ❌ 错误 */
   border-radius: 8px;
   box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
   padding: 16px;
   ```

2. **简单的交互反馈**

   ```css
   /* ✅ 正确 - 只改变颜色和阴影 */
   .card:hover {
     border-color: var(--primary-color);
     box-shadow: var(--shadow-2);
   }

   /* ❌ 错误 - 避免上移动画 */
   .card:hover {
     transform: translateY(-2px);
   }
   ```

3. **扁平化背景**

   ```css
   /* ✅ 正确 */
   background: var(--bg-primary);

   /* ❌ 错误 - 避免渐变 */
   background: linear-gradient(135deg, ...);
   ```

### ❌ 不应该做的

1. **硬编码颜色值**

   ```css
   /* ❌ 错误 */
   color: #3388bb;
   background: rgba(51, 136, 187, 0.1);

   /* ✅ 正确 */
   color: var(--primary-color);
   background: var(--bg-primary);
   ```

2. **干扰性动画**

   ```css
   /* ❌ 错误 - 脉冲动画 */
   animation: pulse 2s infinite;

   /* ❌ 错误 - 浮动动画 */
   animation: float 3s ease-in-out infinite;
   ```

3. **不规则圆角**

   ```css
   /* ❌ 错误 */
   border-radius: 1rem 1rem 0.25rem 1rem;

   /* ✅ 正确 */
   border-radius: var(--radius);
   ```

---

## Tailwind CSS v4 使用规范

### 重要变化

1. **必须使用 v4** - 不兼容 v3
2. **新导入语法**：`@import "tailwindcss"`
3. **PostCSS 配置**：`@tailwindcss/postcss`

### 配置文件

**tailwind.config.js**

```javascript
export default {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3388BB",
      },
    },
  },
};
```

### 与 CSS 变量结合使用

```tsx
// ✅ 正确 - 组合使用
<div className="flex gap-4 p-4 rounded-lg" style={{
  boxShadow: 'var(--shadow-2)',
  borderColor: 'var(--primary-color)'
}}>
```

### HeroUI v3 集成

```tsx
// ✅ HeroUI v3 不需要 Provider
import { Button, Card } from '@heroui/react'

// ✅ 使用 onPress 而不是 onClick
<Button onPress={() => {}} variant="solid">
  保存版本
</Button>

// ✅ 复合组件模式
<Card.Root>
  <Card.Header>标题</Card.Header>
  <Card.Content>内容</Card.Content>
</Card.Root>
```

---

## 常见问题与最佳实践

### Q1: 什么时候使用 Tailwind，什么时候使用 CSS 变量？

**建议：**

- **布局和间距** → Tailwind (`flex`, `gap-4`, `p-4`)
- **颜色、阴影、圆角** → CSS 变量 (`var(--shadow-2)`)
- **自定义样式** → CSS 文件 + CSS 变量

### Q2: 如何确保深色模式兼容？

- HTML 根节点切换策略：

  ```html
  <html class="light" data-theme="drawio2go">
    <html class="dark" data-theme="drawio2go-dark"></html>
  </html>
  ```

- 颜色、圆角、阴影全部放在 `drawio2go.css` 中按 data-theme 维护；其他自定义变量（如 `--shadow-sidebar`）可继续在 `variables.css` 里使用 `.dark` 选择器做补丁。
- Tailwind 工具类会根据 `@theme inline` 输出的 `--color-*` 自动读取主题色，不需要在组件里写额外条件判断。

### Q3: 新增组件时应该如何命名类？

遵循 BEM 命名规范：

```css
.component-name {
} /* 块 */
.component-name__element {
} /* 元素 */
.component-name--modifier {
} /* 修饰符 */
```

### Q4: 如何处理版本管理组件的样式？

**版本管理组件样式文件：**

- `version-sidebar.css` - 侧边栏容器和空状态
- `version-timeline.css` - 版本时间线、WIP 节点和卡片
- `version-dialog.css` - 创建版本对话框

**2025-11-13 视觉升级要点：**

#### 侧边栏 Header（`version-sidebar.css`）

```css
.sidebar-header {
  /* 信息区 + 操作区两栏布局 */
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-lg);
}

.sidebar-header__info {
  /* History 图标 + 标题/描述垂直布局 */
  display: flex;
  gap: var(--spacing-md);
}

.sidebar-header__icon {
  /* 图标容器 */
  color: var(--primary-color); /* #3388BB */
}

.sidebar-header__description {
  /* 副标题描述 */
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.empty-state-card {
  /* 空状态卡片 */
  background: var(--bg-primary);
  border-radius: var(--radius);
  padding: var(--spacing-xl);
}
```

#### 时间线 WIP 节点（`version-timeline.css`）

```css
.version-card--wip {
  border-style: dashed;
  background: var(--bg-primary);
  cursor: default;
}

.version-card--wip::before {
  /* 左侧圆点使用虚线边框，突出实时草稿 */
  border-style: dashed;
}

.version-card--wip .version-card__trigger {
  cursor: default;
}
```

#### 版本时间线（`version-timeline.css`）

```css
.timeline-list {
  position: relative;
}

.timeline-list::before {
  /* 时间线主轴 */
  content: "";
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-primary);
}

.version-card::before {
  /* 时间线节点 */
  content: "";
  position: absolute;
  left: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-color);
}

.version-card--collapsed {
  /* 折叠状态卡片 */
  cursor: pointer;
}

.version-card__compact-view {
  /* 紧凑视图：左侧版本信息 + 右侧时间和箭头 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.version-card__chevron {
  /* 展开箭头 */
  transition: transform var(--transition-fast);
}

.version-card__chevron.rotated {
  transform: rotate(180deg);
}

/* 对比模式扩展 */
.compare-mode-banner {
  /* 选中提示 Banner */
}
.version-card__select-chip {
  /* 加入对比按钮 */
}
.version-card--selected {
  /* 已选状态强调 */
}
.version-compare__overlay {
  /* VersionCompare 弹层 */
}
.version-compare__canvas--overlay {
  /* 叠加布局 */
}

/* 多页/对比工具 */
.page-svg-viewer__* {
  /* PageSVGViewer 控件 */
}
.version-compare__toolbar {
  /* 缩放/布局控制 */
}
.version-compare__placeholder {
  /* 缺页占位 */
}
.version-compare__footer {
  /* 页码与操作栏 */
}
```

#### 徽章系统规范

```css
/* 通用徽章基础样式 */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 1.25rem; /* 20px */
  padding: 0 var(--spacing-sm); /* 0 8px */
  border-radius: var(--radius-sm);
  font-size: 0.625rem; /* 10px */
  font-weight: 500;
  text-transform: uppercase;
}

/* 最新版本徽章 */
.latest-badge {
  background: var(--success-color); /* #22c55e */
  color: white;
}

/* 关键帧徽章 */
.keyframe-badge {
  background: var(--warning-color); /* #f59e0b */
  color: white;
}

/* Diff 徽章 */
.diff-badge {
  background: var(--info-color); /* #8b5cf6 紫色 */
  color: white;
}
```

### Q5: 如何测试样式修改？

1. **开发模式自动热更新** - CSS 修改无需重启
2. **检查设计令牌使用** - 搜索硬编码值 (`px`, `#`, `rgba`)
3. **测试响应式** - 使用浏览器开发者工具模拟不同屏幕
4. **测试深色模式** - 切换 `[data-theme="dark"]`

---

## 更新历史

- **2025-11-17 ~ 2025-11-19**: 主题色彩现代化优化（对比度 + 深色模式完善）
  - **主色调优化**：
    - 使用 OKLCH 色彩空间提升色彩准确性
    - 浅色模式：饱和度从 0.089 提升至 0.11，亮度从 0.584 提升至 0.60
    - 深色模式：饱和度从 0.089 提升至 0.12，亮度从 0.69 提升至 0.72
    - 新增 `--accent-active` 状态（最深/最亮状态）
  - **对比度增强**：
    - 边框透明度：浅色 18%/28%/40%/55%（+6/8/5/10%），深色 30%/40%/50%（+5/5/5%）
    - 阴影系统：模糊半径翻倍（4/8/16/32px），透明度梯度优化（12%→30%）
    - 新增 `--border-focus` 状态（65% 透明度）
  - **语义化颜色现代化**：
    - Success/Warning/Danger/Info 使用更鲜艳的 OKLCH 值
    - 深色模式统一提亮确保可读性
  - **现代 UI 效果**：
    - 新增 `--accent-gradient` 渐变变量（135deg 对角渐变）
    - 新增 `--glass-effect` 和 `--glass-background` 玻璃形态效果
  - **主题切换功能**：
    - 新增 `ThemeToggle` 组件（太阳/月亮图标）
    - localStorage 持久化 + 系统主题检测
    - 避免闪烁的初始化脚本
    - 集成到 TopBar 工具栏
  - **硬编码清理**：
    - 清理 `ProjectSelector.tsx` 中 6 处硬编码 `#3388BB`
    - 清理 `typing-indicator.css` 中 1 处硬编码
    - 移除 prefers-color-scheme 媒体查询（统一使用 data-theme）
  - **文档更新**：
    - 补充完整的 OKLCH 颜色映射表
    - 添加颜色使用决策树
    - 更新阴影、边框、背景系统文档
    - 新增现代 UI 效果使用指南
  - **相关文件**：
    - `app/styles/themes/drawio2go.css`（核心优化）
    - `app/components/ThemeToggle.tsx`（新建）
    - `app/components/TopBar.tsx`（集成切换按钮）
    - `app/layout.tsx`（主题初始化）
    - `app/styles/AGENTS.md`（文档更新）
- **2025-11-13**: 版本页面现代化外观升级（里程碑 3 完成）
  - **版本侧边栏**：新增信息描述区（History 图标 + 副标题）、空状态卡片与悬浮 CTA 按钮
  - **WIP 指示器**：卡片式信息区（Activity 图标 + WIP 徽章）、实时保存状态与元数据展示
  - **历史时间线**：主轴 + 节点视觉、紧凑折叠卡片、Disclosure 展开交互
  - **徽章系统**：统一最新徽章（绿）、关键帧徽章（黄）、Diff 徽章（紫）
  - **文本语义化**：新增 `--text-primary/secondary/tertiary` 变量
  - **相关组件**：`VersionSidebar.tsx`, `WIPIndicator.tsx`, `VersionCard.tsx`, `VersionTimeline.tsx`
- **2025-11-12**: 版本管理 Material Design 规范化（里程碑 2 完成）
  - 统一圆角规范至 4px/8px/12px
  - 建立 Material Design 4 层阴影系统
  - 添加标准间距系统（4px 基准）
  - 移除干扰性动画（脉冲、浮动、上移）
  - 统一徽章样式规范
  - 创建完整设计系统文档

---

**维护提示：** 本文档应随设计系统变更而更新。修改 `drawio2go.css` 后，请同步更新本文档。

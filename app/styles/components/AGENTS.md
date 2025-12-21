# DrawIO2Go 样式组件库文档

> 本文档为 AI 代理提供样式组件的核心指南。样式组件是业务模块级别的样式集合，专注于UI功能实现。

## 快速导航

- [模块概述](#模块概述)
- [文件结构](#文件结构)
- [样式组件分类](#样式组件分类)
- [主要类名与变量](#主要类名与变量)
- [使用示例](#使用示例)
- [注意事项](#注意事项)

---

## 模块概述

### 定位与职责

本目录存放**业务模块级别的样式组件**，介于 `@app/styles/base/`（全局变量、重置） 和 `@app/styles/utilities/`（动画工具） 之间。

- **上游依赖**: `@app/styles/AGENTS.md`（全局设计令牌、颜色、阴影、圆角等）
- **关键特性**:
  - 服务于聊天、版本管理、历史记录等功能模块
  - 使用 CSS 变量实现主题切换（浅色/深色）
  - 遵循 Material Design + 扁平化设计规范
  - 支持响应式布局（移动端适配）

---

## 文件结构

```
app/styles/components/
├── chat.css                 # 聊天侧边栏（消息、输入区）
├── image.css                # 图片展示组件（消息内 ImageContent / 全屏 ImagePreview）
├── sessions.css             # 会话管理（标题栏、菜单）
├── toast.css                # Toast 通知系统
├── modal.css                # 弹窗样式（模态框）
├── model-selector.css       # 模型选择器样式（Popover 内容、下拉项）
├── version-sidebar.css      # 版本侧边栏布局与空状态
├── version-timeline.css     # 版本时间线、卡片、对比查看器
├── version-dialog.css       # 版本对话框框架
├── version-animations.css   # 版本管理相关动画
└── history-view.css         # 历史记录视图（列表、预览）
```

**文件规模**: 共11个CSS模块，总计约2800行代码

---

## 样式组件分类

### 1. 聊天模块 (chat.css + sessions.css)

| 类名                       | 用途                            |
| -------------------------- | ------------------------------- |
| `.chat-sidebar-content`    | 聊天侧边栏主容器                |
| `.chat-messages-area`      | 消息区域（flex列布局）          |
| `.messages-scroll-area`    | 滚动容器，自定义滚动条          |
| `.chat-inline-warning`     | 内联警告提示（采样warning色系） |
| `.message`                 | 单条消息容器，slideIn动画       |
| `.message-body--user`      | 用户消息样式（主色背景）        |
| `.message-body--assistant` | AI回复样式（透明背景）          |
| `.chat-input-area`         | 输入区域（底部栏）              |
| `.chat-session-header`     | 会话标题栏                      |
| `.chat-session-menu`       | 会话选择下拉菜单                |

**设计细节**:

- 消息卡片圆角: `border-radius: 1rem 1rem 0.25rem 1rem`（不对称）
- 空状态图标: 圆形背景 + 主色文字
- 菜单项悬停: 微动画 `transform: translateX(2px)`

### 2. 版本管理 (version-\*.css)

#### 侧边栏 (version-sidebar.css)

| 类名                | 用途                    |
| ------------------- | ----------------------- |
| `.version-sidebar`  | 主容器，flex列布局      |
| `.sidebar-header`   | 粘性头部，包含标题+按钮 |
| `.sidebar-content`  | 可滚动内容区            |
| `.empty-state-card` | 空状态卡片（虚线边框）  |

#### 时间线 (version-timeline.css)

| 类名                            | 用途                       |
| ------------------------------- | -------------------------- |
| `.timeline-list`                | 时间线列表，相对定位       |
| `.timeline-list::before`        | 竖直主轴线条               |
| `.version-card`                 | 版本卡片，节点圆点装饰     |
| `.version-card::before`         | 时间线节点（圆圈）         |
| `.version-card--latest`         | 最新版本标记               |
| `.version-card--compare`        | 对比模式（虚线边框）       |
| `.version-preview`              | SVG预览容器（16:10宽高比） |
| `.version-preview--interactive` | 可交互预览（悬停叠加层）   |
| `.version-pages-grid`           | 多页栅格（auto-fit响应式） |

#### 对话框 (version-dialog.css)

| 类名                | 用途                  |
| ------------------- | --------------------- |
| `.dialog-overlay`   | 半透明遮罩 + 模糊背景 |
| `.dialog-container` | 弹窗容器，动画slideUp |
| `.dialog-header`    | 头部，flex布局        |
| `.dialog-content`   | 可滚动内容区          |
| `.dialog-footer`    | 底部按钮栏            |
| `.error-message`    | 错误提示样式          |

#### 对比查看器 (version-timeline.css延伸)

| 类名                                | 用途                              |
| ----------------------------------- | --------------------------------- |
| `.version-compare__overlay`         | 对比查看器遮罩                    |
| `.version-compare__container`       | 主容器（1200px最宽）              |
| `.version-compare__canvas`          | 双栏对比布局                      |
| `.version-compare__canvas--stack`   | 堆叠模式（单栏）                  |
| `.version-compare__canvas--overlay` | 叠加模式（单栏+滑块）             |
| `.smart-diff__panel`                | 智能Diff面板（左侧图片+右侧统计） |
| `.smart-diff__swatch`               | 变化指示色块（绿/红/黄）          |

### 3. Toast通知 (toast.css)

| 类名                                              | 用途                             |
| ------------------------------------------------- | -------------------------------- |
| `.toast-stack`                                    | 通知堆栈容器，固定定位（右下角） |
| `.toast`                                          | 单条通知卡片                     |
| `.toast--open`                                    | 进入动画（从下方滑入）           |
| `.toast[data-variant="success\|warning\|danger"]` | 语义色彩主题                     |
| `.toast__content`                                 | 内容区（标题+描述）              |
| `.toast__close`                                   | 关闭按钮                         |

**关键特性**:

- 使用 CSS 变量动态主题: `--toast-bg`, `--toast-fg`, `--toast-border`
- 控制按钮（复制/关闭）随变体协调: `--toast-accent` + `--toast-control-*`（hover/focus 对比度更稳定）
- 响应式适配: 小屏幕居中显示 (sm: translateX(-50%))
- z-index: 1300（高于Modal的1000和Dialog的1000）

### 4. 历史记录 (history-view.css)

| 类名                                  | 用途                      |
| ------------------------------------- | ------------------------- |
| `.history-view`                       | 主容器，右侧预留空间      |
| `.history-toolbar`                    | 搜索+筛选栏               |
| `.history-toolbar__date`              | 日期范围筛选              |
| `.history-list`                       | 卡片列表，flex列布局      |
| `.history-card`                       | 单条历史卡片              |
| `.history-card[data-selected="true"]` | 选中状态（主色边框+背景） |

---

## 主要类名与变量

### 通用设计令牌

所有组件均依赖 `@app/styles/AGENTS.md` 定义的变量：

```css
/* 圆角 */
--radius: 0.5rem; /* 8px - 默认 */
--radius-sm: 0.25rem; /* 4px - 徽章 */
--radius-lg: 0.75rem; /* 12px - 对话框 */

/* 间距 */
--spacing-sm: 0.5rem; /* 8px */
--spacing-md: 1rem; /* 16px */
--spacing-lg: 1.5rem; /* 24px */

/* 颜色（OKLCH色彩空间） */
--accent: oklch(0.6 0.11 235); /* 主色调 */
--success: oklch(0.75 0.22 150); /* 成功绿 */
--warning: oklch(0.78 0.19 68); /* 警告黄 */
--danger: oklch(0.65 0.24 25); /* 错误红 */
--info: oklch(0.62 0.23 290); /* 信息紫 */

/* 阴影（Material Design） */
--shadow-xs: 0 1px 2px...; /* 最淡 */
--shadow-1: 0 1px 4px...; /* 卡片默认 */
--shadow-2: 0 2px 8px...; /* 悬停 */
--shadow-4: 0 4px 16px...; /* 弹出 */
--shadow-8: 0 8px 32px...; /* 模态 */

/* 动画 */
--duration-short: 150ms; /* 颜色变化 */
--duration-medium: 200ms; /* 悬停 */
--duration-long: 300ms; /* 展开 */
--ease-out-cubic: cubic-bezier(...);
```

### 版本管理特定变量

```css
/* 可能在version-timeline.css中本地定义 */
--card-radius-compact: 0.25rem; /* 4px - 超紧凑 */
--card-padding-compact-collapsed: ...;
--badge-height-compact: 1.25rem;
--font-size-compact-xs: 0.625rem; /* 10px */
--font-size-compact-sm: 0.75rem; /* 12px */
```

### BEM命名规范

```css
/* 块 */
.version-card {
}

/* 元素 */
.version-card__content {
}
.version-card__trigger {
}

/* 修饰符 */
.version-card--latest {
}
.version-card--compare {
}
.version-card--selected {
}
```

---

## 使用示例

### 例1: 聊天消息样式

```jsx
// 组件使用CSS变量
<div className="message message-ai">
  <div className="message-meta message-meta--user">
    <span className="message-meta-text">AI Assistant</span>
  </div>
  <div className="message-body message-body--assistant">
    <div className="message-content message-content--assistant">
      {/* Markdown内容 */}
    </div>
  </div>
</div>

// CSS中
.message-body--assistant {
  background: inherit;                    /* 继承容器背景 */
  color: var(--foreground);               /* 使用CSS变量 */
  padding: 0.5rem 0 1rem;
}

.dark .message-body--assistant {
  color: var(--foreground, #f8fafc);      /* 深色模式后备值 */
}
```

### 例2: 版本卡片时间线

```jsx
<div className="timeline-list">
  {/* ::before伪元素绘制竖直线 */}
  {versions.map(v => (
    <div
      className={`version-card ${v.latest ? 'version-card--latest' : ''}`}
      // ::before伪元素绘制节点圆点
    >
      <button className="version-card__trigger">
        <div className="version-card__compact-view">
          <div className="version-card__compact-left">
            <span className="version-number">{v.number}</span>
            <p className="version-card__compact-description">{v.desc}</p>
          </div>
          <div className="version-card__compact-right">
            {badges}
            <svg className="version-card__chevron"></svg>
          </div>
        </div>
      </button>
      {/* 展开内容 */}
      <div className="version-card__expanded-content">
        <div className="version-preview">
          <img className="version-preview__image" src={svg} />
        </div>
      </div>
    </div>
  ))}
</div>

// 时间线CSS
.timeline-list::before {
  content: "";
  position: absolute;
  left: 0.45rem;
  width: 2px;
  background: var(--border-primary);  /* 使用主色透明度 */
}

.version-card::before {
  /* 节点圆点 */
  width: 0.625rem;
  height: 0.625rem;
  background: var(--background);
  border: 2px solid var(--primary-color);
}
```

### 例3: Toast通知

```jsx
<div className="toast-stack">
  <div
    className={`toast ${isOpen ? 'toast--open' : 'toast--leaving'}`}
    data-variant="success"
  >
    <svg>{/* icon */}</svg>
    <div className="toast__content">
      <h4 className="toast__title">操作成功</h4>
      <p className="toast__description">版本已保存</p>
    </div>
    <button className="toast__close">×</button>
  </div>
</div>

// CSS
.toast[data-variant="success"] {
  --toast-bg: color-mix(in oklch, var(--success) 12%, var(--surface));
  --toast-fg: var(--success-foreground);
  --toast-border: color-mix(in oklch, var(--success) 35%, transparent);
}
```

### 例4: 深色模式适配

```css
/* 浅色模式默认值 */
.history-card__title {
  font-weight: 600;
  font-size: 0.98rem;
  line-height: 1.3;
  color: var(--foreground, #0f172a);
}

/* 深色模式增强对比 */
.dark .history-card__title {
  color: var(--foreground, #e5e7eb); /* 更亮的文字 */
}
```

---

## 注意事项

### 1. Tailwind CSS v4 集成

- **支持状态**: 组件样式优先使用 **CSS 变量**，不依赖 Tailwind 工具类
- **混用时机**: 仅在布局和间距时使用 Tailwind (flex, gap, p-)
- **避免**: 硬编码颜色值 (`#3388BB`、`rgba(255, 0, 0)`)

### 2. HeroUI v3 兼容性

- 组件使用 `onPress` 而非 `onClick`（HeroUI v3规范）
- 不需要 Provider 包装
- 样式不与HeroUI冲突（使用 `@layer components`）

### 3. 主题切换

```html
<!-- 浅色模式 -->
<html class="light" data-theme="drawio2go">
  <!-- 深色模式 -->
  <html class="dark" data-theme="drawio2go-dark"></html>
</html>
```

所有变量在 `@app/styles/themes/drawio2go.css` 按 `data-theme` 属性维护两套值。

### 4. 色彩空间与对比度

- **OKLCH色彩空间**: 更均匀的色彩感知，便于主题变换
- **深色模式提亮**: 变量值直接增大亮度通道（L值），确保可读性
- **透明度梯度**: `color-mix(in oklch, var(--color) 12%~65%, transparent)`

### 5. 动画最佳实践

**✅ 应该做的:**

- 简约过渡: `transition: border-color 0.2s ease`
- 滑入/淡入: `slideIn`, `fadeIn` (200-300ms)
- 微交互反馈: 色彩+阴影变化

**❌ 不应该做的:**

- ~~干扰性脉冲~~: `animation: pulse infinite`
- ~~大幅位移~~: `transform: translateY(-8px)` (使用-1px/2px替代)
- ~~长持续时间~~: 动画>500ms

### 6. 响应式设计

主要断点:

- `@media (max-width: 960px)`: 版本对比容器自适应
- `@media (max-width: 720px)`: 历史预览移至底部
- `@media (max-width: 640px)`: Toast居中 + 全宽适配
- `@media (max-width: 480px)`: 版本时间线缩进调整

### 7. 滚动条自定义

```css
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}
```

### 8. z-index层级

```
1500: 多页面SVG查看器叠加层
1300: Toast堆栈
1000: Modal/Dialog遮罩
 500: 下拉菜单
  10: 粘性头部
```

### 9. 性能优化

- 使用 `will-change: transform` 加速复杂动画
- 避免频繁重排: 使用 CSS 变量而非JS改样式
- 图片 `object-fit: contain` 保持宽高比，减少布局闪烁

---

## 相关链接

- **全局样式指南**: `@app/styles/AGENTS.md`
- **布局模块**: `app/styles/layout/AGENTS.md` (如存在)
- **动画工具**: `app/styles/utilities/` (transition, animation相关)
- **主题配置**: `app/styles/themes/drawio2go.css`

---

**维护提示**:

1. 修改任何组件样式前，检查全局变量是否已定义
2. 新增组件时，创建对应 CSS 文件，在此文档中补充说明
3. 删除硬编码色值：搜索 `#`、`rgb`、`rgba` 并替换为 `var(--*)`
4. 测试深色模式：切换 `data-theme` 属性或使用 `prefers-color-scheme` 媒体查询
5. 动画修改后，检查无障碍设置 `prefers-reduced-motion`

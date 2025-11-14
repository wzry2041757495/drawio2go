# HeroUI V3 统一迁移项目

## 📋 项目概述

将 DrawIO2Go 项目的前端 UI 元素统一迁移至 HeroUI V3，消除样式覆盖，建立统一的设计系统。

## 🎯 迁移目标

1. **统一组件库**：所有 UI 组件使用 HeroUI V3（Beta）
2. **消除样式覆盖**：不再对 HeroUI 组件样式进行 !important 覆盖
3. **主题配置**：通过 HeroUI 主题系统配置主题色 #3388BB 和圆角样式
4. **CSS 精简**：删除冗余 CSS，统一全局样式
5. **提升维护性**：降低样式复杂度，提升代码可维护性

## 📊 迁移成果目标

| 指标                   | 当前        | 目标     | 改进  |
| ---------------------- | ----------- | -------- | ----- |
| CSS 文件数量           | 24 个       | 14 个    | -42%  |
| CSS 总行数             | ~2800 行    | ~1500 行 | -46%  |
| 样式覆盖（!important） | 大量使用    | 完全消除 | -100% |
| 硬编码颜色             | 多处        | 几乎消除 | -90%+ |
| 自定义组件样式类       | 大量 BEM 类 | 最小化   | -70%  |

## 🚀 里程碑进度

| 里程碑                                                          | 状态      | 预计时间 | 优先级      | 完成日期 |
| --------------------------------------------------------------- | --------- | -------- | ----------- | -------- |
| [Milestone 1: 主题配置](./milestone-1-theme-setup.md)           | 🔲 待开始 | 2-3h     | ⭐⭐⭐ 最高 | -        |
| [Milestone 2: Button 迁移](./milestone-2-button-migration.md)   | 🔲 待开始 | 3-4h     | ⭐⭐⭐ 高   | -        |
| [Milestone 3: 表单组件](./milestone-3-form-components.md)       | 🔲 待开始 | 2-3h     | ⭐⭐ 中     | -        |
| [Milestone 4: 复杂组件](./milestone-4-complex-components.md)    | 🔲 待开始 | 3-4h     | ⭐⭐ 中     | -        |
| [Milestone 5: 全局 CSS 优化](./milestone-5-css-optimization.md) | 🔲 待开始 | 2-3h     | ⭐⭐ 中     | -        |
| [Milestone 6: 测试验证](./milestone-6-testing.md)               | 🔲 待开始 | 2h       | ⭐⭐⭐ 高   | -        |

**状态图例**：

- 🔲 待开始
- 🔄 进行中
- ✅ 已完成
- ⚠️ 受阻
- ❌ 已取消

**📌 重要说明**：CSS 清理已整合到各个里程碑中

- **Milestone 2**: 完成按钮迁移后立即删除 `buttons.css`
- **Milestone 3**: 完成表单迁移后立即删除 `forms.css` 和相关样式
- **Milestone 4**: 完成复杂组件迁移后立即删除 `modal.css` 等
- **Milestone 5**: 专注于全局 CSS 优化和最终整理，而非大规模删除

这种渐进式清理策略可以：

- ✅ 即时验证迁移效果
- ✅ 降低风险，避免一次性大规模修改
- ✅ 明确每个 CSS 文件删除的原因

## 🔧 技术决策记录

### 决策 1：使用 HeroUI 原生 variant 而非自定义样式

- **日期**：2025-11-14
- **决策**：删除所有 `.button-primary`、`.button-secondary` 等自定义类，使用 HeroUI 的 `variant`、`color` props
- **理由**：避免样式覆盖冲突，保持设计系统一致性，降低维护成本
- **影响**：需要修改 12+ 个组件文件中的按钮使用方式

### 决策 2：尽可能迁移到 HeroUI 组件

- **日期**：2025-11-14
- **决策**：能用 HeroUI 实现的组件都替换为 HeroUI 组件（如 Alert、Skeleton、Separator）
- **理由**：减少自定义代码，获得 HeroUI 的无障碍性、响应式等特性
- **影响**：需要重构部分组件（如 ErrorBanner → Alert）

### 决策 3：圆角系统映射到 HeroUI 主题

- **日期**：2025-11-14
- **决策**：将现有的 `--radius-sm/--radius/--radius-lg` (4px/8px/12px) 映射到 HeroUI 的 radius 配置
- **理由**：保持现有设计规范，通过主题配置统一管理
- **影响**：需要创建自定义 HeroUI 主题文件

### 决策 4：主题色配置为 primary 色

- **日期**：2025-11-14
- **决策**：将 #3388BB 配置为 HeroUI 的 primary 色（转换为 oklch 格式）
- **理由**：保持现有品牌色，通过 HeroUI 主题系统统一应用
- **影响**：需要配置浅色和深色模式的主题色变量

### 决策 5：保留复杂业务组件

- **日期**：2025-11-14
- **决策**：保留 MessageItem、VersionCard 等带有复杂业务逻辑的自定义组件
- **理由**：这些组件包含特定业务逻辑和布局，强行迁移成本过高
- **影响**：确保这些组件内部使用的基础组件来自 HeroUI

### 决策 6：渐进式 CSS 清理策略

- **日期**：2025-11-14
- **决策**：将 CSS 清理任务整合到各个组件迁移里程碑中，而非单独的里程碑
- **理由**：
  - 组件迁移完成后立即清理相关 CSS，可即时验证迁移效果
  - 降低风险，避免累积大量待删除文件
  - 明确因果关系，知道每个 CSS 文件为何被删除
- **影响**：
  - Milestone 2 完成后删除 `buttons.css`
  - Milestone 3 完成后删除 `forms.css`
  - Milestone 4 完成后删除 `modal.css`、简化其他文件
  - Milestone 5 改为全局 CSS 优化，而非大规模删除

## 📐 设计系统规范

### 主题色

- **Primary**: #3388BB（蓝色）
  - oklch: `oklch(0.5843 0.0889 234.67)`
  - Hover: `#2a6fa0`
  - Light: `#e6f2f9`

### 圆角系统

```css
--radius-sm: 4px /* 小元素（徽章、标签） */ --radius: 8px
  /* 标准元素（按钮、输入框、卡片） */ --radius-lg: 12px
  /* 大元素（对话框、大卡片） */;
```

### 间距系统（4px 基准）

```css
--spacing-xs: 4px --spacing-sm: 8px --spacing-md: 16px --spacing-lg: 24px
  --spacing-xl: 32px;
```

### Material Design 阴影

```css
--shadow-1: 0 1px 3px rgba(51, 136, 187, 0.12) /* 轻微提升 */ --shadow-2: 0 2px
  6px rgba(51, 136, 187, 0.16) /* 标准提升 */ --shadow-4: 0 4px 12px
  rgba(51, 136, 187, 0.16) /* 中等提升 */ --shadow-8: 0 8px 24px
  rgba(51, 136, 187, 0.16) /* 高层级提升 */;
```

## ⚠️ 风险与应对

### 风险 1：HeroUI v3 Beta 稳定性

- **风险等级**：中
- **描述**：HeroUI v3 仍处于 Beta 阶段，API 可能变化
- **应对措施**：
  - 锁定版本号 `@heroui/react@3.0.0-beta.1`
  - 监控 HeroUI 发布日志
  - 准备回滚策略

### 风险 2：样式破坏性变更

- **风险等级**：高
- **描述**：迁移过程可能破坏现有样式和交互
- **应对措施**：
  - 分里程碑逐步迁移
  - 每个里程碑完成后进行功能测试
  - 使用 Git 分支进行开发，保留回滚点

### 风险 3：组件行为差异

- **风险等级**：中
- **描述**：HeroUI 组件的默认行为可能与自定义组件不同（如 onPress vs onClick）
- **应对措施**：
  - 仔细阅读 HeroUI 文档
  - 测试所有交互场景
  - 必要时使用 HeroUI 的自定义 hooks

## 🔄 回滚策略

### 完全回滚

如果迁移失败，需要完全回滚：

```bash
# 回滚到迁移前的 commit
git reset --hard <迁移前的commit-hash>
```

### 部分回滚

如果某个里程碑出现问题：

1. 回滚该里程碑的所有修改
2. 创建 Issue 记录问题
3. 分析问题后再次尝试

### 渐进式迁移

如果风险过高，可采用渐进式策略：

1. 创建 `app/styles/legacy/` 目录备份旧 CSS
2. 新组件使用 HeroUI，旧组件保持不变
3. 逐步替换，而非一次性迁移

## 📚 参考资源

### HeroUI V3 官方文档

- [Introduction](https://v3.heroui.com/docs/introduction)
- [Theming Guide](https://v3.heroui.com/docs/handbook/theming)
- [Components List](https://v3.heroui.com/docs/components-list)
- [Design Principles](https://v3.heroui.com/docs/design-principles)

### 项目内部文档

- [AGENTS.md](/AGENTS.md) - 项目开发准则
- [当前 CSS 架构分析](./analysis-current-css.md) - 待创建

### 相关技术栈

- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [React Aria Components](https://react-spectrum.adobe.com/react-aria/)
- [OKLCH Color Tool](https://oklch.com)

## 📝 变更日志

### 2025-11-14

- ✅ 项目初始化
- ✅ 创建迁移计划和里程碑文件
- 🔲 待开始：Milestone 1 - 主题配置

---

**最后更新**：2025-11-14
**项目负责人**：AI Assistant + User
**预计完成时间**：6 个里程碑，总计 14-19 小时

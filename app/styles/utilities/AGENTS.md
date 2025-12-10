# 样式工具集（utilities）

## 模块概述

`app/styles/utilities/` 存放跨组件共用的纯 CSS 工具样式，覆盖动画、滚动条、Markdown、工具调用等场景，基于 Tailwind CSS v4 与 CSS 变量。

## 代码腐化清理记录

### 2025-12-08 清理

**执行的操作**：

- 将 `ToolCallCard` 的样式从组件内联抽离到 `tool-calls.css`，统一状态/动画类名。
- 补充按压/展开的样式变量占位，便于后续配合 `usePress` 扩展交互反馈。
- 新增本 AGENTS 文档，明确 utilities 目录职责与依赖范围。

**影响文件**：1 个（tool-calls.css）

**下次关注**：

- 若其它组件存在内联样式，优先迁移到 utilities 目录并复用现有变量。

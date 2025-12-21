# MCP 组件（mcp/）

## 概述

该目录承载 MCP（Model Context Protocol）相关 UI 组件。

## 组件清单

### McpButton.tsx

用于展示 MCP 接口暴露状态的按钮组件：

- 未激活：`variant="secondary"`，文本 "MCP 接口"
- 已激活：`variant="primary"`，文本 "暴露中"
- 事件：使用 HeroUI v3 的 `onPress`，禁用使用 `isDisabled`

### McpConfigDialog.tsx

MCP 配置对话框组件：

- 结构：HeroUI `Dropdown` + `Dropdown.Popover` + `Surface`（侧边栏内弹出，非 Modal）
- 触发：由父组件提供 `trigger`（通常为 `McpButton`），并通过 `isOpen/onOpenChange` 受控
- Web 环境：显示“仅支持 APP 端”提示并禁用确认
- 定位：`placement="top end"`，贴近触发按钮弹出
- 表单：
  - 监听地址：HeroUI v3 `Select` 下拉组件（127.0.0.1 / 0.0.0.0），使用 `Select.Trigger` + `Select.Popover` + `ListBox` 复合组件模式；0.0.0.0 选项内直接附带安全说明（不再单独弹出警告块）
  - 端口模式：HeroUI v3 `Select` 下拉组件（指定 / 自动选择），使用复合组件模式；选择“自动选择”时仅记录模式，实际端口在点击“启动”时分配（不在弹窗内提示具体端口）
  - 端口输入：仅在“指定”模式显示，`Input type="number"`，不再限制为 8000-9000（仅做基本整数/范围校验）
  - 工具函数：使用 `normalizeSelection` + `extractSingleKey`（来自 `@/app/lib/select-utils`）处理 HeroUI v3 Select 的 `onSelectionChange` 回调
- 按钮：取消 `variant="tertiary"`，确认 `variant="primary"`（提交时显示 `Spinner`）

### McpConfigDisplay.tsx

MCP 配置展示组件（代码块 + 复制按钮）：

- 根据 `McpClientType` 生成配置示例文本（5 种客户端：Cursor、Claude Code、Codex、Gemini CLI、通用）
- 配置格式：命令行（Claude Code/Codex/Gemini CLI）或 JSON（Cursor/通用，包含 `type: "http"` 字段）
- 右上角复制按钮：复制到剪贴板后 Toast 提示"配置已复制"

### McpExposureOverlay.tsx

MCP 暴露界面（不可关闭遮罩）：

- 使用普通 `div` + `createPortal` 将 overlay portal 到 ChatSidebar 容器内，实现局部遮罩（`absolute inset-0`），`z-index: 100`，背景 `bg-black/50 backdrop-blur-sm`；避免 `ModalOverlay` 触发全局 `inert`/focus trap
- 头部：标题 + `host:port` 状态 + danger 停止按钮
- 客户端选择：HeroUI `Select`（Cursor / Claude Code / Codex / Gemini CLI / 通用），默认 Cursor
- 配置展示：复用 `McpConfigDisplay`
- 提示：蓝色提示框“版本控制功能在被外部 MCP 调用中依然有效”

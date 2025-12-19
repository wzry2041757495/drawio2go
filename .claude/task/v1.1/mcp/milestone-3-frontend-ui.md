# 里程碑 3：前端 UI 组件

## 目标

实现 MCP 暴露功能的用户界面，包括按钮、配置对话框和全屏暴露界面。

## 状态

⏳ 待开始

## 预计时间

3-4 天

## 依赖

- 里程碑 2 完成

## 新增文件

```
app/
├── components/mcp/
│   ├── McpButton.tsx           # MCP 按钮组件
│   ├── McpConfigDialog.tsx     # 配置对话框
│   ├── McpExposureOverlay.tsx  # 全屏暴露界面
│   ├── McpConfigDisplay.tsx    # 配置展示组件
│   └── index.ts                # 组件统一导出
├── hooks/
│   └── useMcpServer.ts         # MCP 状态管理 Hook
└── types/
    └── mcp.ts                  # MCP 相关类型定义
```

## 修改文件

```
app/components/chat/
├── ChatInputArea.tsx   # [修改] 添加 MCP 按钮插槽
└── ChatSidebar.tsx     # [修改] 集成 MCP 状态管理，监听工具调用
```

## 任务清单

### 3.1 类型定义 (`app/types/mcp.ts`)

- [ ] `McpServerStatus` - 服务器状态类型
- [ ] `McpConfig` - 配置类型（host, port）
- [ ] `McpToolRequest` - 工具调用请求类型
- [ ] `McpToolResponse` - 工具调用响应类型

### 3.2 状态管理 Hook (`app/hooks/useMcpServer.ts`)

- [ ] 状态管理：`{ running, host, port, isLoading }`
- [ ] `startServer(config)` - 启动服务器（调用 IPC）
- [ ] `stopServer()` - 停止服务器
- [ ] `refreshStatus()` - 刷新状态
- [ ] 集成 Toast 通知（成功/失败）
- [ ] Electron 环境检测（`typeof window.electronMcp !== 'undefined'`）

### 3.3 MCP 按钮 (`McpButton.tsx`)

- [ ] 使用 HeroUI `Button` 组件
- [ ] 图标：`ServerIcon` (lucide-react)
- [ ] 状态切换：
  - 未激活：`variant="secondary"`，显示"MCP 接口"
  - 已激活：`variant="primary"`，显示"暴露中"
- [ ] `onPress` 回调
- [ ] `isDisabled` 支持

### 3.4 配置对话框 (`McpConfigDialog.tsx`)

- [ ] 使用 React Aria `ModalOverlay` + `Modal` + HeroUI `Surface`
- [ ] **Web 端检测**：显示"仅支持 APP 端"提示
- [ ] **IP 选择**：
  - HeroUI `RadioGroup`
  - 选项：`127.0.0.1`（本地）/ `0.0.0.0`（局域网）
  - 默认：`127.0.0.1`
- [ ] **端口输入**：
  - HeroUI `Input` (type="number")
  - 范围验证：8000-9000
  - "随机端口"按钮（调用 `mcp:getRandomPort`）
- [ ] **操作按钮**：
  - 取消按钮：`variant="tertiary"`
  - 确认按钮：`variant="primary"`，启动时显示 `Spinner`
- [ ] 表单验证和错误提示

### 3.5 全屏暴露界面 (`McpExposureOverlay.tsx`)

- [ ] 全屏覆盖布局（`z-[2000]`，`bg-black/80`）
- [ ] 使用 React Aria `ModalOverlay` + `Modal`
- [ ] **不可关闭**：`isDismissable={false}`
- [ ] **头部区域**：
  - 标题："MCP 接口已暴露"
  - 状态显示：`正在暴露：{host}:{port}`
  - 停止按钮：`variant="danger"`，图标 `XCircle`
- [ ] **客户端选择器**：
  - HeroUI `Select`
  - 5 个选项：Cursor / Claude Code / Codex / Gemini CLI / 通用
- [ ] **配置展示区**：
  - `McpConfigDisplay` 组件
- [ ] **版本控制提示**：
  - 蓝色提示框
  - 文本："版本控制功能在被外部 MCP 调用中依然有效"

### 3.6 配置展示组件 (`McpConfigDisplay.tsx`)

- [ ] 根据客户端类型生成配置文本
- [ ] 复制按钮（右上角）
- [ ] `<pre><code>` 代码展示
- [ ] 复制成功 Toast 通知

### 3.7 修改 `ChatInputArea.tsx`

- [ ] 在 `TextArea` 上方添加 MCP 按钮容器
- [ ] Electron 环境检测（仅 APP 端显示）
- [ ] 布局样式：`mcp-button-row`

### 3.8 修改 `ChatSidebar.tsx`

- [ ] 集成 `useMcpServer` Hook
- [ ] 管理对话框/覆盖层状态
- [ ] **监听 MCP 工具调用请求**：
  - 使用 `window.electronMcp.onToolRequest(callback)`
  - 调用 `frontend-tools.ts` 中的对应函数
  - 返回结果：`window.electronMcp.sendToolResponse(requestId, result)`
- [ ] 工具调用上下文：需要 `getDrawioXML` 和 `replaceDrawioXML`

### 3.9 组件导出 (`index.ts`)

- [ ] 导出所有 MCP 组件

## UI 设计规范

### HeroUI v3 规范

- 复合组件模式
- 语义化 variants（primary/secondary/tertiary/danger）
- 事件使用 `onPress` 替代 `onClick`
- 状态使用 `isDisabled` 替代 `disabled`

### 样式规范

- 圆角：`var(--radius)` / `var(--radius-lg)`
- 间距：`var(--spacing-*)` (4px 基准)
- 阴影：`var(--shadow-*)` (Material Design)
- 禁止硬编码颜色/尺寸

## 验收标准

- [ ] MCP 按钮在 APP 端正常显示
- [ ] Web 端点击显示"仅支持 APP 端"提示
- [ ] 配置对话框 IP/端口选择工作正常
- [ ] 随机端口按钮能获取可用端口
- [ ] 确认后服务器正常启动
- [ ] 全屏暴露界面正确显示
- [ ] 5 种客户端配置示例正确生成
- [ ] 复制功能正常
- [ ] 停止按钮能关闭服务器
- [ ] Toast 通知正确显示
- [ ] 工具调用桥接完整（MCP → 渲染进程 → DrawIO）

## 注意事项

- 参考 `ModelComboBox` 和 `ConfirmDialog` 的实现模式
- 工具调用监听器需要在组件卸载时清理
- 全屏覆盖层需要处理键盘事件（禁用 Escape 关闭）
- 状态同步：服务器意外停止时更新 UI

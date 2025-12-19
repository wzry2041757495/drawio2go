# MCP 暴露功能 - 任务概览

## 功能目标

为 DrawIO2Go APP 端添加 MCP（Model Context Protocol）服务器暴露功能，允许外部 AI 工具（Cursor、Claude Code、Codex、Gemini CLI 等）通过 MCP 协议调用 DrawIO 操作工具。

## 核心特性

1. **聊天页面 MCP 按钮**：紧贴输入框上方，点击后弹出配置对话框
2. **配置对话框**：选择 IP（127.0.0.1/0.0.0.0）和端口（8000-9000），支持随机可用端口
3. **全屏暴露界面**：显示暴露状态、可复制的客户端配置示例、版本控制提示
4. **Web 端降级**：显示"仅支持 APP 端"提示
5. **MCP 工具**：复用现有的 `drawio_read`、`drawio_edit_batch`、`drawio_overwrite` 三个工具
6. **协议支持**：MCP Streamable HTTP (2025-11-25 规范)

## 技术架构

```
前端 UI 层 (React + HeroUI v3)
    ↓ IPC 通信
Electron 主进程
    ↓ 工具调用桥接
MCP HTTP 服务器 (独立端口 8000-9000)
    ↓ JSON-RPC/SSE
外部 MCP 客户端 (Cursor/Claude Code/Codex/...)
```

## 里程碑划分

| 里程碑       | 文件                                                                           | 预计时间 | 状态      |
| ------------ | ------------------------------------------------------------------------------ | -------- | --------- |
| **里程碑 1** | [milestone-1-server-infrastructure.md](./milestone-1-server-infrastructure.md) | 2-3 天   | ⏳ 待开始 |
| **里程碑 2** | [milestone-2-electron-integration.md](./milestone-2-electron-integration.md)   | 1-2 天   | ⏳ 待开始 |
| **里程碑 3** | [milestone-3-frontend-ui.md](./milestone-3-frontend-ui.md)                     | 3-4 天   | ⏳ 待开始 |
| **里程碑 4** | [milestone-4-styles-i18n.md](./milestone-4-styles-i18n.md)                     | 1-2 天   | ⏳ 待开始 |
| **里程碑 5** | [milestone-5-config-examples.md](./milestone-5-config-examples.md)             | 1 天     | ⏳ 待开始 |

**总计预估**：10-15 天

## 技术决策

1. **使用 @modelcontextprotocol/sdk**：官方 TypeScript SDK，支持 MCP 2025-11-25 规范，内置会话管理和传输层
2. **独立 MCP 服务器端口**：8000-9000 范围，避免与 Next.js (3000) 冲突
3. **工具执行在渲染进程**：复用 `app/lib/frontend-tools.ts` 现有逻辑
4. **会话管理**：由 SDK 内置机制处理

## 安全考虑

- **端口绑定**：默认 127.0.0.1（本地），可选 0.0.0.0（局域网，需警告）
- **IP 白名单**：仅允许本地回环和私有网络 IP
- **会话隔离**：UUID 会话 ID，独立上下文
- **超时保护**：1 小时未活动自动清理

## 验收标准

✅ MCP 服务器能正常启动/停止
✅ 3 个 DrawIO 工具能通过 MCP 协议调用
✅ 5 种客户端配置示例准确
✅ Web 端显示降级提示
✅ UI 符合 HeroUI v3 设计规范
✅ 中英文国际化完整
✅ IP 白名单生效
✅ 并发 10 个工具调用无异常
✅ 内存稳定运行 1 小时无泄漏
✅ 测试覆盖率 > 80%

## 相关文档

- [完整实现计划](/home/aaa/.claude/plans/bright-watching-anchor.md)
- [MCP 规范](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#streamable-http)
- [项目 AGENTS.md](/home/aaa/Code/drawio2go/AGENTS.md)

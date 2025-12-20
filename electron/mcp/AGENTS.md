# Electron MCP 模块（mcp/）

## 作用

该目录用于承载 DrawIO2Go 的 MCP（Model Context Protocol）服务器相关代码，包括：

- 端口分配与端口可用性检测工具
- MCP 服务器启动/停止逻辑（后续）
- Electron 主进程侧的 MCP 集成（后续）

## 开发约定

- 以 **Node.js CommonJS** 为主（`require` / `module.exports`），便于在 Electron 主进程直接加载。
- 端口分配默认范围为 **8000-9000**（含边界），避免与 Next.js 默认端口 3000 冲突。
- 端口检测必须使用 `net` 绑定方式（真实占用检测），而不是仅检查进程列表。
- 工具函数应返回 `Promise` 并确保所有 Server 句柄正确 `close()`，避免资源泄露。
- 保持实现“纯工具化”：不引入 Electron API，不读写磁盘，不做日志输出（由调用方负责）。


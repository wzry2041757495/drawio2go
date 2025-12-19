# 里程碑 5：配置示例模板

## 目标

为 5 种 MCP 客户端提供准确的配置示例模板。

## 状态

⏳ 待开始

## 预计时间

1 天

## 依赖

- 里程碑 3 完成（`McpConfigDisplay` 组件）

## 任务清单

### 5.1 Cursor 编辑器配置

**格式**：

```json
{
  "mcpServers": {
    "drawio2go": {
      "url": "http://{host}:{port}/mcp",
      "transport": "http"
    }
  }
}
```

- [ ] 确认 Cursor MCP 配置格式
- [ ] 验证配置可用性

### 5.2 Claude Code 配置

使用`claude mcp add`命令

```bash
Examples:
  # Add HTTP server:
  claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

### 5.3 Codex CLI 配置

使用`codex mcp add`命令

```bash
codex mcp add --help                                                                                                    ░▒▓ ✔
[experimental] Add a global MCP server entry

Usage: codex mcp add [OPTIONS] <NAME> (--url <URL> | -- <COMMAND>...)

Arguments:
  <NAME>
          Name for the MCP server configuration

  [COMMAND]...
          Command to launch the MCP server. Use --url for a streamable HTTP server
```

### 5.4 Gemini CLI 配置

使用`gemini mcp add`命令

```bash
Usage: gemini mcp add [options] <name> <commandOrUrl> [args...]

Positionals:
  name          Name of the server                                                                                       [string] [required]
  commandOrUrl  Command (stdio) or URL (sse, http)                                                                       [string] [required]

Options:
  -d, --debug              Run in debug mode?                                                                     [boolean] [default: false]
  -s, --scope              Configuration scope (user or project)                  [string] [choices: "user", "project"] [default: "project"]
  -t, --transport, --type  Transport type (stdio, sse, http)                   [string] [choices: "stdio", "sse", "http"] [default: "stdio"]
  -e, --env                Set environment variables (e.g. -e KEY=value)                                                             [array]
  -H, --header             Set HTTP headers for SSE and HTTP transports (e.g. -H "X-Api-Key: abc123" -H "Authorization: Bearer abc123")
                                                                                                                                     [array]
      --timeout            Set connection timeout in milliseconds                                                                   [number]
      --trust              Trust the server (bypass all tool call confirmation prompts)                                            [boolean]
      --description        Set the description for the server                                                                       [string]
      --include-tools      A comma-separated list of tools to include                                                                [array]
      --exclude-tools      A comma-separated list of tools to exclude                                                                [array]
  -h, --help               Show help                                                                                               [boolean]
```

### 5.5 通用配置

**格式**：

```json
{
  "mcpServers": {
    "drawio2go": {
      "url": "http://{host}:{port}/mcp",
      "transport": "http"
    }
  }
}
```

### 5.6 前端集成

- [ ] 在 `McpConfigDisplay.tsx` 中实现配置生成逻辑
- [ ] 动态替换 `{host}` 和 `{port}` 占位符
- [ ] 根据 `client` 参数返回对应配置

## 注意事项

- 配置格式可能随客户端版本更新而变化
- 建议添加版本说明或更新日期
- 配置文件路径在不同操作系统可能不同（Windows/macOS/Linux）

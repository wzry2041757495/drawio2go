# 里程碑 1：Electron MCP 服务器基础架构

## 目标

使用 `@modelcontextprotocol/sdk` 官方 SDK 搭建 MCP HTTP 服务器，实现 Streamable HTTP 传输协议。

## 状态

⏳ 待开始

## 预计时间

1-2 天

## 新增文件

```
electron/mcp/
├── mcp-server.js       # 基于 SDK 的 MCP 服务器核心
└── mcp-port-utils.js   # 端口分配工具
```

## 任务清单

### 1.1 端口分配工具 (`mcp-port-utils.js`)

- [ ] `isPortAvailable(port)` - 检测端口是否可用
- [ ] `findAvailablePort(start, end)` - 查找范围内可用端口
- [ ] `getRandomAvailablePort(8000, 9000)` - 随机分配端口
- [ ] 使用 Node.js `net` 模块实现

### 1.2 MCP 服务器核心 (`mcp-server.js`)

基于 `@modelcontextprotocol/sdk` 实现：

- [ ] 导入 SDK 模块
  ```javascript
  const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
  const {
    StreamableHTTPServerTransport,
  } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
  ```
- [ ] 创建 `McpServer` 实例
  ```javascript
  const server = new McpServer({
    name: "drawio2go",
    version: "1.0.0",
  });
  ```
- [ ] 注册 3 个 DrawIO 工具
  - [ ] `drawio_read` - 读取当前图表 XML
  - [ ] `drawio_edit_batch` - 批量编辑图表
  - [ ] `drawio_overwrite` - 覆盖整个图表
- [ ] 工具定义使用 zod schema 进行参数验证
- [ ] 创建 HTTP 服务器并绑定 `StreamableHTTPServerTransport`
- [ ] 实现 `start(host, port)` - 启动服务器
- [ ] 实现 `stop()` - 停止服务器
- [ ] 实现 `getStatus()` - 获取服务器状态
- [ ] 设置工具执行回调（通过 IPC 桥接到渲染进程）

### 1.3 工具定义示例

```javascript
const { z } = require("zod");

// drawio_read 工具
server.tool(
  "drawio_read",
  "读取当前 DrawIO 图表的 XML 内容",
  {}, // 无参数
  async () => {
    const xml = await executeInRenderer("drawio_read", {});
    return { content: [{ type: "text", text: xml }] };
  },
);

// drawio_edit_batch 工具
server.tool(
  "drawio_edit_batch",
  "批量编辑 DrawIO 图表元素",
  {
    edits: z
      .array(
        z.object({
          id: z.string().describe("元素 ID"),
          action: z.enum(["update", "delete", "add"]).describe("操作类型"),
          properties: z.record(z.any()).optional().describe("属性键值对"),
        }),
      )
      .describe("编辑操作列表"),
  },
  async ({ edits }) => {
    const result = await executeInRenderer("drawio_edit_batch", { edits });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
);

// drawio_overwrite 工具
server.tool(
  "drawio_overwrite",
  "覆盖整个 DrawIO 图表的 XML 内容",
  {
    xml: z.string().describe("新的完整 XML 内容"),
  },
  async ({ xml }) => {
    const result = await executeInRenderer("drawio_overwrite", { xml });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
);
```

## 依赖

```json
{
  "@modelcontextprotocol/sdk": "^1.x.x",
  "zod": "^3.25.0"
}
```

**安装命令**：

```bash
pnpm add @modelcontextprotocol/sdk zod
```

## SDK 核心概念

### McpServer

高级服务器类，提供：

- 工具注册：`server.tool(name, description, schema, handler)`
- 资源注册：`server.resource(uri, mimeType, handler)`
- 提示注册：`server.prompt(name, description, handler)`

### StreamableHTTPServerTransport

Streamable HTTP 传输层，特点：

- 支持 MCP 2025-11-25 规范
- 自动处理 JSON-RPC 协议
- 内置会话管理（`MCP-Session-Id` 头）
- 支持 SSE 流式响应

### 请求/响应格式

**POST /mcp 请求**：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "drawio_read",
    "arguments": {}
  }
}
```

**响应**：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "..." }],
    "isError": false
  }
}
```

## 验收标准

- [ ] 服务器能在指定端口正常启动
- [ ] 端口冲突时能自动选择下一个可用端口
- [ ] `initialize` 请求返回正确的服务器信息
- [ ] `tools/list` 返回 3 个 DrawIO 工具定义
- [ ] 工具参数使用 zod schema 验证
- [ ] 优雅关闭不会残留进程

## 参考资源

- [@modelcontextprotocol/sdk - npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [GitHub - typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [SDK 示例代码](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/src/examples)
- [MCP 2025-11-25 规范](https://modelcontextprotocol.io/specification/2025-11-25)

## 注意事项

- 工具调用桥接逻辑在里程碑 2 实现
- 错误处理由 SDK 统一管理，返回标准 JSON-RPC 错误
- SDK 内置会话管理，无需手动实现

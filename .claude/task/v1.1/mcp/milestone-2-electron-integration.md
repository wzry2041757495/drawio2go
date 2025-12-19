# 里程碑 2：Electron 主进程集成

## 目标

在 Electron 主进程中添加 MCP IPC 接口，实现主进程与渲染进程之间的工具调用桥接。

## 状态

⏳ 待开始

## 预计时间

1-2 天

## 依赖

- 里程碑 1 完成

## 修改文件

```
electron/
├── main.js       # [修改] 添加 MCP IPC 处理器
└── preload.js    # [修改] 暴露 MCP API
```

## 任务清单

### 2.1 修改 `electron/main.js`

- [ ] 导入 MCP 服务器模块（基于 SDK 实现）
- [ ] 添加全局变量 `let mcpServer = null`
- [ ] 实现 IPC 处理器：
  - [ ] `mcp:start` - 启动 MCP 服务器
    - 参数：`{ host, port }`
    - 返回：`{ success, host, port }` 或抛出错误
    - 防止重复启动
  - [ ] `mcp:stop` - 停止 MCP 服务器
    - 返回：`{ success }`
    - 处理未启动情况
  - [ ] `mcp:status` - 查询服务器状态
    - 返回：`{ running, host?, port? }`
  - [ ] `mcp:getRandomPort` - 获取随机可用端口
    - 返回：`number` (8000-9000)
- [ ] 添加工具调用桥接逻辑
  - [ ] SDK 的 `server.tool()` 回调中调用 IPC 发送 `mcp-tool-request` 到渲染进程
  - [ ] 监听 `mcp-tool-response` 事件返回结果
  - [ ] 实现超时保护（30 秒）
- [ ] 在 `gracefulAppShutdown` 中添加 MCP 服务器清理

### 2.2 工具执行桥接函数

在 `mcp-server.js` 中实现 `executeInRenderer` 函数：

```javascript
// 工具执行桥接 - 通过 IPC 调用渲染进程的 frontend-tools
async function executeInRenderer(toolName, args) {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => {
      reject(new Error("Tool execution timeout (30s)"));
    }, 30000);

    ipcMain.once(`mcp-tool-response-${requestId}`, (event, result) => {
      clearTimeout(timeout);
      if (result.success) {
        resolve(result.data);
      } else {
        reject(new Error(result.error));
      }
    });

    mainWindow.webContents.send("mcp-tool-request", {
      requestId,
      toolName,
      args,
    });
  });
}
```

### 2.3 修改 `electron/preload.js`

- [ ] 创建 `electronMcp` API 对象
- [ ] 暴露 IPC 方法：
  - [ ] `start(config)` - 启动服务器
  - [ ] `stop()` - 停止服务器
  - [ ] `getStatus()` - 查询状态
  - [ ] `getRandomPort()` - 获取随机端口
  - [ ] `onToolRequest(callback)` - 监听工具调用请求
  - [ ] `sendToolResponse(requestId, result)` - 发送工具执行结果
- [ ] 使用 `contextBridge.exposeInMainWorld('electronMcp', mcpApi)`
- [ ] 对象冻结 `Object.freeze()`

### 2.4 工具调用桥接流程

使用 SDK 后，流程更加简洁：

```
MCP 客户端
    ↓ POST /mcp (tools/call)
MCP SDK (StreamableHTTPServerTransport)
    ↓ 自动处理 JSON-RPC 协议
SDK McpServer
    ↓ 调用 server.tool() 注册的回调函数
mcp-server.js (executeInRenderer)
    ↓ webContents.send('mcp-tool-request', { requestId, toolName, args })
Electron 主进程 (main.js)
    ↓ IPC 转发
渲染进程 (ChatSidebar.tsx)
    ↓ frontend-tools.ts 执行
    ↓ ipcRenderer.send('mcp-tool-response', requestId, result)
Electron 主进程
    ↓ ipcMain.once(`mcp-tool-response-${requestId}`)
mcp-server.js (Promise resolve/reject)
    ↓ return result
SDK McpServer
    ↓ 自动封装 JSON-RPC 响应
MCP 客户端
```

## IPC 接口定义

### mcp:start

```typescript
// 请求
{ host: '127.0.0.1' | '0.0.0.0', port: number }
// 成功响应
{ success: true, host: string, port: number }
// 失败：抛出 Error
```

### mcp:stop

```typescript
// 请求：无参数
// 响应
{ success: true, message?: string }
```

### mcp:status

```typescript
// 请求：无参数
// 响应
{ running: boolean, host?: string, port?: number }
```

### mcp:getRandomPort

```typescript
// 请求：无参数
// 响应：number (8000-9000)
```

### mcp-tool-request (渲染进程接收)

```typescript
{
  requestId: string,    // 唯一请求 ID
  toolName: string,     // 'drawio_read' | 'drawio_edit_batch' | 'drawio_overwrite'
  args: object          // 工具参数
}
```

### mcp-tool-response (渲染进程发送)

```typescript
{
  requestId: string,
  result: {
    success: boolean,
    data?: any,
    error?: string
  }
}
```

## 验收标准

- [ ] `window.electronMcp` 在渲染进程可用
- [ ] 能通过 IPC 启动/停止 MCP 服务器
- [ ] 状态查询正确返回服务器信息
- [ ] 随机端口分配工作正常
- [ ] 工具调用桥接流程完整（主进程 → 渲染进程 → 主进程）
- [ ] 超时保护生效（30 秒无响应抛出错误）
- [ ] 应用退出时 MCP 服务器正确清理

## 注意事项

- 参考现有 `electronStorage` API 的实现模式
- 工具调用请求 ID 需要唯一性（时间戳 + 随机数）
- 超时后需要清理监听器，避免内存泄漏
- 日志记录关键操作便于调试
- SDK 的 `server.tool()` 回调是异步的，需要正确处理 Promise
- `executeInRenderer` 函数需要在 `mcp-server.js` 创建时传入 `mainWindow` 引用

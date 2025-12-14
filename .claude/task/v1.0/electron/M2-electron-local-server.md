# M2: Electron 本地服务器

## 目标

在 Electron 主进程中实现本地 HTTP + Socket.IO 服务器，托管静态资源并提供 API 端点。

## 前置依赖

- [M1: API 核心抽象](./M1-api-core-abstraction.md) 完成

## 设计原则

### 1. 模块化架构

```
electron/
├── main.js                 # 主入口（保持精简）
├── local-server/           # 本地服务器模块
│   ├── index.js            # 服务器创建和启动
│   ├── routes.js           # API 路由定义
│   ├── socket-handler.js   # Socket.IO 事件处理
│   └── static-server.js    # 静态资源托管
└── preload.js              # 预加载脚本
```

### 2. 复用现有逻辑

- **Socket.IO 处理**：从 `server.js` 提取，共享事件处理逻辑
- **API 处理**：调用 M1 抽取的 `api-core` 模块
- **存储管理**：复用现有 `storage-manager.js`

### 3. 安全性

- 服务仅绑定 `127.0.0.1`，不对外暴露
- 使用动态端口避免冲突
- 保持 CSP 策略

## 模块结构

```
electron/
├── main.js
├── preload.js
├── storage-manager.js      # 现有，保持不变
├── local-server/
│   ├── index.js            # 服务器工厂
│   ├── routes.js           # Express 路由
│   ├── socket-handler.js   # Socket.IO 配置
│   └── middleware.js       # 中间件（CORS、JSON 解析等）
└── shared/
    └── socket-events.js    # Socket 事件常量（与 server.js 共享）
```

## 任务清单

### 2.1 提取 Socket.IO 事件处理逻辑

**目标**：将 `server.js` 中的 Socket.IO 逻辑提取为可复用模块。

**创建 `electron/shared/socket-events.js`**：

```javascript
// 事件名称常量
const EVENTS = {
  JOIN_PROJECT: "join_project",
  LEAVE_PROJECT: "leave_project",
  TOOL_EXECUTE: "tool:execute",
  TOOL_RESULT: "tool:result",
  TOOL_ERROR: "tool:error",
  // ...
};

// 项目房间管理器
class ProjectRoomManager {
  constructor() {
    this.projectMembers = new Map();
    this.socketJoinedProjects = new Map();
  }

  trackJoin(socketId, projectUuid) {
    /* ... */
  }
  trackLeave(socketId, projectUuid) {
    /* ... */
  }
  getProjectMembers(projectUuid) {
    /* ... */
  }
}

// 待处理请求管理器
class PendingRequestManager {
  constructor() {
    this.requests = new Map();
  }

  add(requestId, resolve, reject) {
    /* ... */
  }
  resolve(requestId, result) {
    /* ... */
  }
  reject(requestId, error) {
    /* ... */
  }
}
```

**修改 `server.js`**：复用上述共享模块。

### 2.2 实现本地服务器模块

**`electron/local-server/index.js`**：

```javascript
const http = require("http");
const express = require("express");
const { Server: SocketIOServer } = require("socket.io");

async function createLocalServer(options = {}) {
  const { port = 0, staticDir } = options;

  const app = express();

  // 应用中间件
  applyMiddleware(app);

  // 注册路由
  registerRoutes(app, apiContext);

  // 静态资源托管
  serveStatic(app, staticDir);

  // 创建 HTTP 服务器
  const httpServer = http.createServer(app);

  // 创建 Socket.IO 服务器
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // 设置 Socket.IO 事件处理
  setupSocketHandler(io, pendingRequestManager);

  // 启动服务
  return new Promise((resolve) => {
    httpServer.listen(port, "127.0.0.1", () => {
      const actualPort = httpServer.address().port;
      resolve({ httpServer, io, port: actualPort });
    });
  });
}
```

### 2.3 实现 API 路由

**`electron/local-server/routes.js`**：

```javascript
const { handleChat, handleTest, handleHealth } = require("../../dist/api-core");

function registerRoutes(app, context) {
  // 聊天端点
  app.post("/api/chat", async (req, res) => {
    const result = await handleChat(
      { body: req.body, signal: createAbortSignal(req) },
      context,
    );
    sendResult(res, result);
  });

  // 测试端点
  app.post("/api/test", async (req, res) => {
    const result = await handleTest({ body: req.body }, context);
    sendResult(res, result);
  });

  // 健康检查
  app.head("/api/health", (req, res) => res.status(204).end());
  app.get("/api/health", (req, res) => {
    const result = handleHealth();
    res.json(result.data);
  });

  // 页面卸载通知
  app.post("/api/chat/unload", (req, res) => res.status(204).end());
}

// 流式响应处理
function sendResult(res, result) {
  if (!result.success) {
    return res.status(result.error.status || 500).json(result.error);
  }

  if (result.stream) {
    res.setHeader("Content-Type", "text/event-stream");
    pipeStream(result.stream, res);
  } else {
    res.json(result.data);
  }
}
```

### 2.4 实现静态资源托管

**`electron/local-server/static-server.js`**：

```javascript
const express = require("express");
const path = require("path");

function serveStatic(app, staticDir) {
  // 静态资源
  app.use(express.static(staticDir));

  // SPA fallback - 所有未匹配路由返回 index.html
  app.get("*", (req, res, next) => {
    // 排除 API 路由
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(staticDir, "index.html"));
  });
}
```

### 2.5 修改 Electron 主入口

**`electron/main.js` 修改**：

```javascript
const { createLocalServer } = require("./local-server");

let localServer = null;

app.whenReady().then(async () => {
  // 初始化存储管理器（保持不变）
  storageManager.initialize();

  // 生产模式：启动本地服务器
  if (app.isPackaged) {
    const staticDir = path.join(__dirname, "../out");
    localServer = await createLocalServer({ staticDir });
    console.log(`Local server running on port ${localServer.port}`);
  }

  createWindow();
});

function createWindow() {
  const win = new BrowserWindow({
    /* ... */
  });

  // 根据环境选择加载 URL
  const url = app.isPackaged
    ? `http://127.0.0.1:${localServer.port}`
    : "http://localhost:3000";

  win.loadURL(url);
}

// 应用退出时清理
app.on("will-quit", () => {
  if (localServer) {
    localServer.httpServer.close();
  }
});
```

### 2.6 更新 preload.js

**暴露环境信息**：

```javascript
contextBridge.exposeInMainWorld("electron", {
  // 现有 API 保持不变
  storage: {
    /* ... */
  },

  // 新增：环境信息
  env: {
    isPackaged: app.isPackaged,
    platform: process.platform,
  },
});
```

## 文件变更清单

| 操作 | 文件                                      | 说明                 |
| ---- | ----------------------------------------- | -------------------- |
| 新增 | `electron/shared/socket-events.js`        | 共享 Socket 事件处理 |
| 新增 | `electron/local-server/index.js`          | 服务器工厂           |
| 新增 | `electron/local-server/routes.js`         | API 路由             |
| 新增 | `electron/local-server/socket-handler.js` | Socket.IO 处理       |
| 新增 | `electron/local-server/static-server.js`  | 静态资源托管         |
| 新增 | `electron/local-server/middleware.js`     | 中间件配置           |
| 修改 | `electron/main.js`                        | 启动本地服务器       |
| 修改 | `electron/preload.js`                     | 暴露环境信息         |
| 修改 | `server.js`                               | 复用共享 Socket 模块 |

## 新增依赖

```json
{
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}
```

## 验收标准

- [ ] `pnpm run electron:dev` 正常工作（使用 Next.js 开发服务器）
- [ ] 手动测试：主进程启动本地服务器，渲染进程能访问
- [ ] API 端点响应正确（/api/health, /api/test）
- [ ] Socket.IO 连接正常
- [ ] 静态资源加载正常（CSS、JS、图片）
- [ ] SPA 路由正常（刷新页面不 404）

## 注意事项

1. **端口动态分配**：使用 `port: 0` 让系统分配可用端口
2. **仅本地访问**：绑定 `127.0.0.1` 而非 `0.0.0.0`
3. **资源清理**：应用退出时关闭 HTTP 服务器
4. **错误处理**：服务器启动失败时给出明确提示
5. **日志记录**：记录服务器端口和关键事件，便于调试

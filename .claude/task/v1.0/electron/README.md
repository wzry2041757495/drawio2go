# Electron 静态导出支持

## 问题背景

项目在打包为 Electron 应用时存在以下问题：

1. **静态导出与 API Routes 冲突**：`output: "export"` 无法与 `app/api/**/route.ts` 共存
2. **前端依赖后端服务**：聊天、测试、健康检查均依赖 `/api/*` 端点
3. **工具调用依赖 Socket.IO**：`global.io` 只在 Node 服务中初始化
4. **`file://` 资源路径问题**：静态资源使用绝对路径，file 协议下解析失败

## 解决方案概述

采用**混合架构**：

- **Electron 生产版**：主进程运行本地 HTTP + Socket.IO 服务，托管静态资源并提供 API
- **Web 版**：保持现有 Node.js + Next.js 动态渲染架构

## 核心设计原则

### 1. 代码复用

```
app/lib/api-core/          # 共享 API 核心逻辑
├── 被 Next.js Route Handlers 调用 (Web 版)
└── 被 Electron 本地服务器调用 (桌面版)
```

### 2. 关注点分离

| 层级          | 职责                     | 位置                       |
| ------------- | ------------------------ | -------------------------- |
| 核心逻辑      | 业务处理、流式响应       | `app/lib/api-core/`        |
| Web 适配      | Next.js Request/Response | `app/api/*/route.ts`       |
| Electron 适配 | Express Request/Response | `electron/local-server.js` |

### 3. 环境无关性

API 核心模块不依赖：

- Next.js 特定 API（`NextRequest`, `NextResponse`）
- Electron 特定 API（`ipcMain`, `BrowserWindow`）
- 全局变量（`global.io`）→ 改为依赖注入

## 里程碑列表

| 里程碑                              | 名称              | 说明                    | 依赖       |
| ----------------------------------- | ----------------- | ----------------------- | ---------- |
| [M1](./M1-api-core-abstraction.md)  | API 核心抽象      | 抽取共享业务逻辑        | -          |
| [M2](./M2-electron-local-server.md) | Electron 本地服务 | 主进程 HTTP + Socket.IO | M1         |
| [M3](./M3-build-pipeline.md)        | 构建流程          | 多目标构建配置          | M1, M2     |
| [M4](./M4-integration-testing.md)   | 集成与测试        | 端到端验证              | M1, M2, M3 |

## 架构图

```
┌────────────────────────────────────────────────────────────────┐
│                      共享层 (app/lib/)                          │
├────────────────────────────────────────────────────────────────┤
│  api-core/                                                      │
│  ├── handlers/          # 请求处理器                            │
│  │   ├── chat.ts        # 聊天核心逻辑                          │
│  │   ├── test.ts        # 连接测试逻辑                          │
│  │   └── health.ts      # 健康检查逻辑                          │
│  ├── types.ts           # 平台无关的类型定义                     │
│  └── index.ts           # 统一导出                              │
├────────────────────────────────────────────────────────────────┤
│  现有模块 (保持不变)                                             │
│  ├── drawio-ai-tools.ts                                        │
│  ├── tool-executor.ts                                          │
│  ├── config-utils.ts                                           │
│  └── storage/                                                   │
└────────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌─────────────────────┐            ┌─────────────────────────────┐
│   Web 版适配层       │            │   Electron 版适配层          │
├─────────────────────┤            ├─────────────────────────────┤
│ app/api/*/route.ts  │            │ electron/local-server.js    │
│ ├── NextRequest     │            │ ├── Express                 │
│ ├── NextResponse    │            │ ├── 静态资源托管             │
│ └── 调用 api-core   │            │ └── 调用 api-core           │
├─────────────────────┤            ├─────────────────────────────┤
│ server.js           │            │ electron/main.js            │
│ └── Socket.IO       │            │ └── 启动 local-server       │
└─────────────────────┘            └─────────────────────────────┘
```

## 验收标准

- [ ] `pnpm run dev` + `pnpm run electron:dev` 正常工作
- [ ] `pnpm run electron:build` 成功生成安装包
- [ ] Electron 生产版 AI 聊天和工具调用正常
- [ ] Web 版行为无变化
- [ ] 无代码重复，核心逻辑单一来源

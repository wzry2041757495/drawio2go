# M4: 集成与测试

## 目标

端到端验证整个解决方案，确保：

1. Electron 生产版所有功能正常
2. Web 版行为无回归
3. 开发体验不受影响

## 前置依赖

- [M1: API 核心抽象](./M1-api-core-abstraction.md) 完成
- [M2: Electron 本地服务器](./M2-electron-local-server.md) 完成
- [M3: 构建流程](./M3-build-pipeline.md) 完成

## 测试策略

### 测试层级

```
┌─────────────────────────────────────────────────────────────┐
│  E2E 测试 (Playwright + Electron)                           │
│  - 完整用户流程                                              │
│  - AI 聊天交互                                               │
│  - DrawIO 编辑和工具调用                                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  集成测试                                                    │
│  - API 核心模块 + Express 适配                               │
│  - Socket.IO 工具调用链路                                    │
│  - 存储层跨环境一致性                                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  单元测试 (Vitest)                                          │
│  - API 核心处理器                                            │
│  - 共享 Socket 事件模块                                      │
│  - 配置规范化逻辑                                            │
└─────────────────────────────────────────────────────────────┘
```

## 任务清单

### 4.1 手动验收测试

#### 4.1.1 开发模式验证

**测试步骤**：

```bash
# 1. 启动开发服务器
pnpm run dev

# 2. 验证 Web 版
# - 访问 http://localhost:3000
# - 测试 DrawIO 编辑器加载
# - 测试 AI 聊天功能
# - 测试工具调用（读取/编辑 XML）

# 3. 启动 Electron 开发模式
pnpm run electron:dev

# - 验证热重载正常
# - 验证与 Web 版功能一致
```

**检查清单**：

- [ ] DrawIO 编辑器正常加载
- [ ] 可以创建/编辑图形
- [ ] AI 聊天可以发送消息
- [ ] 流式响应正常显示
- [ ] 工具调用（drawio_read）返回正确数据
- [ ] 工具调用（drawio_edit_batch）修改生效
- [ ] Socket.IO 连接稳定
- [ ] 存储（项目列表、会话历史）正常

#### 4.1.2 Electron 生产版验证

**测试步骤**：

```bash
# 1. 完整构建
pnpm run electron:build

# 2. 安装并运行
# - macOS: 打开 dist-electron/*.dmg，安装应用
# - Windows: 运行 dist-electron/*.exe
# - Linux: 运行 dist-electron/*.AppImage

# 3. 功能验证
# - 所有功能与开发模式一致
```

**检查清单**：

- [ ] 应用正常启动，无白屏
- [ ] 界面样式正确加载
- [ ] 本地存储（SQLite）正常
- [ ] AI 聊天功能正常
- [ ] 工具调用功能正常
- [ ] 无控制台错误
- [ ] 应用可正常退出

#### 4.1.3 Web 版回归验证

**测试步骤**：

```bash
# 1. 启动生产服务器
pnpm run build
pnpm run start

# 2. 访问 http://localhost:3000
# 3. 完整功能验证
```

**检查清单**：

- [ ] 所有功能与重构前一致
- [ ] API 响应格式无变化
- [ ] Socket.IO 事件无变化
- [ ] 无性能回归

### 4.2 自动化测试（可选，后续迭代）

#### 4.2.1 API 核心单元测试

**创建 `app/lib/api-core/__tests__/`**：

```typescript
// health.test.ts
import { handleHealth } from "../handlers/health";

describe("handleHealth", () => {
  it("returns success with timestamp", () => {
    const result = handleHealth();
    expect(result.success).toBe(true);
    expect(result.data.ok).toBe(true);
    expect(result.data.timestamp).toBeDefined();
  });
});

// test.test.ts
import { handleTest } from "../handlers/test";

describe("handleTest", () => {
  it("returns error for invalid config", async () => {
    const result = await handleTest(
      {
        body: { apiUrl: "", apiKey: "", modelName: "" },
      },
      {},
    );

    expect(result.success).toBe(false);
  });
});
```

#### 4.2.2 Socket 事件模块测试

**创建 `electron/shared/__tests__/`**：

```javascript
// socket-events.test.js
const {
  ProjectRoomManager,
  PendingRequestManager,
} = require("../socket-events");

describe("ProjectRoomManager", () => {
  it("tracks socket joins correctly", () => {
    const manager = new ProjectRoomManager();
    manager.trackJoin("socket-1", "project-a");

    expect(manager.getProjectMembers("project-a")).toContain("socket-1");
  });
});

describe("PendingRequestManager", () => {
  it("resolves pending request", () => {
    const manager = new PendingRequestManager();
    const promise = new Promise((resolve, reject) => {
      manager.add("req-1", resolve, reject);
    });

    manager.resolve("req-1", { success: true });

    return expect(promise).resolves.toEqual({ success: true });
  });
});
```

#### 4.2.3 E2E 测试（Playwright + Electron）

**配置 `playwright.config.ts`**：

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "web",
      use: { browserName: "chromium" },
    },
    // Electron 测试需要额外配置
  ],
});
```

**创建 `e2e/chat.spec.ts`**：

```typescript
import { test, expect } from "@playwright/test";

test("can send chat message", async ({ page }) => {
  await page.goto("/");

  // 等待编辑器加载
  await page.waitForSelector('[data-testid="drawio-editor"]');

  // 打开聊天面板
  await page.click('[data-testid="chat-toggle"]');

  // 输入消息
  await page.fill('[data-testid="chat-input"]', "Hello");
  await page.click('[data-testid="chat-send"]');

  // 验证消息出现
  await expect(page.locator('[data-testid="chat-message"]')).toBeVisible();
});
```

### 4.3 性能验证

#### 4.3.1 启动时间

**测量方法**：

```javascript
// electron/main.js
const startTime = Date.now();

app.whenReady().then(async () => {
  // ... 启动逻辑

  const loadTime = Date.now() - startTime;
  console.log(`App ready in ${loadTime}ms`);
});
```

**基准**：

- 本地服务器启动：< 1000ms
- 首屏渲染：< 3000ms

#### 4.3.2 包体积

**检查命令**：

```bash
# 查看构建产物大小
du -sh out/
du -sh dist/api-core/
du -sh dist-electron/

# 分析 Next.js 包体积
npx @next/bundle-analyzer
```

**基准**：

- `out/`：< 50MB
- `dist/api-core/`：< 5MB
- Electron 安装包：< 200MB

### 4.4 问题排查指南

#### 4.4.1 常见问题

| 问题          | 可能原因         | 排查方法                           |
| ------------- | ---------------- | ---------------------------------- |
| 白屏          | 静态资源路径错误 | 检查 `out/index.html` 中的资源路径 |
| AI 聊天无响应 | 本地服务器未启动 | 检查控制台日志，确认端口           |
| 工具调用失败  | Socket.IO 未连接 | 检查 WebSocket 连接状态            |
| 样式丢失      | CSS 未正确加载   | 检查 Network 面板                  |
| 存储失败      | SQLite 路径错误  | 检查 userData 目录权限             |

#### 4.4.2 调试命令

```bash
# 开启 Electron 调试日志
DEBUG=electron* pnpm run electron:dev

# 检查 asar 包内容
npx asar list dist-electron/*/resources/app.asar

# 验证原生模块
node -e "require('better-sqlite3')"
```

## 验收标准汇总

### 必须通过

- [ ] 开发模式 Web 版正常
- [ ] 开发模式 Electron 正常
- [ ] 生产构建成功
- [ ] Electron 生产版可安装运行
- [ ] AI 聊天功能正常
- [ ] 工具调用功能正常
- [ ] 存储功能正常

### 建议通过

- [ ] 单元测试覆盖核心模块
- [ ] 启动时间符合基准
- [ ] 包体积符合基准
- [ ] 无控制台警告

## 发布检查清单

在正式发布前，确认以下事项：

1. **版本号更新**：`package.json` 中的 `version`
2. **更新日志**：记录本次变更
3. **多平台测试**：macOS、Windows、Linux 至少各测试一个
4. **签名和公证**（macOS）：确保应用可正常打开
5. **自动更新测试**（如有）：验证升级流程

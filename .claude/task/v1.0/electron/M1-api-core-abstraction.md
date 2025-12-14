# M1: API 核心抽象

## 目标

将 API 业务逻辑从 Next.js Route Handlers 中抽取为平台无关的共享模块，供 Web 和 Electron 复用。

## 设计原则

### 1. 依赖注入

核心处理器不访问全局变量，所有依赖通过参数传入：

```typescript
// 错误示范 ❌
function handleChat(body) {
  global.io.emit(...);  // 依赖全局变量
}

// 正确示范 ✅
function handleChat(body, context: HandlerContext) {
  context.socketIO.emit(...);  // 依赖注入
}
```

### 2. 平台无关的输入/输出

不使用 `NextRequest`/`NextResponse`，使用通用接口：

```typescript
// 输入：纯 JS 对象
interface ChatInput {
  body: ChatRequestBody;
  signal?: AbortSignal;
}

// 输出：统一结果类型
type HandlerResult<T> =
  | { success: true; data: T; stream?: ReadableStream }
  | { success: false; error: ApiError };
```

### 3. 流式响应抽象

聊天需要流式响应，抽象为可消费的流：

```typescript
interface StreamableResult {
  toStream(): ReadableStream<Uint8Array>;
  toAsyncIterator(): AsyncIterable<string>;
}
```

## 模块结构

```
app/lib/api-core/
├── handlers/
│   ├── chat.ts           # 聊天处理器
│   ├── test.ts           # 连接测试处理器
│   └── health.ts         # 健康检查处理器
├── types.ts              # 共享类型定义
├── context.ts            # 处理器上下文定义
└── index.ts              # 统一导出
```

## 任务清单

### 1.1 定义共享类型 (`types.ts`)

**输入类型**：

- `ChatRequestBody` - 聊天请求体（从现有代码提取）
- `TestRequestBody` - 测试请求体
- `HealthRequestParams` - 健康检查参数

**输出类型**：

- `HandlerResult<T>` - 统一结果包装
- `ApiError` - 错误结构（复用 `error-codes.ts`）
- `StreamableResponse` - 流式响应接口

**上下文类型**：

- `HandlerContext` - 处理器依赖上下文

### 1.2 定义处理器上下文 (`context.ts`)

```typescript
interface HandlerContext {
  // Socket.IO 实例（工具调用需要）
  socketIO?: SocketIOServer;

  // 待处理请求 Map（工具调用需要）
  pendingRequests?: Map<string, PendingRequest>;

  // 工具执行发射器
  emitToolExecute?: EmitToolExecuteFn;

  // 存储适配器（会话验证需要，可选）
  storage?: StorageAdapter;

  // 是否跳过会话验证（Electron 环境）
  skipSessionValidation?: boolean;
}
```

### 1.3 实现聊天处理器 (`handlers/chat.ts`)

**从 `app/api/chat/route.ts` 提取**：

1. 请求验证逻辑 → 复用 `helpers/request-validator.ts`
2. 配置规范化 → 复用 `config-utils.ts`
3. 会话验证 → 条件执行，通过 `context.skipSessionValidation` 控制
4. 模型创建 → 复用 `helpers/model-factory.ts`
5. 图片处理 → 复用 `helpers/image-utils.ts`
6. 推理参数 → 复用 `helpers/reasoning-utils.ts`
7. 流式生成 → 返回 `StreamableResponse`
8. 错误分类 → 复用 `helpers/error-classifier.ts`

**关键变更**：

- 移除 `NextRequest`/`NextResponse` 依赖
- `global.io` → `context.socketIO`
- 返回 `HandlerResult` 而非直接 Response

### 1.4 实现测试处理器 (`handlers/test.ts`)

**从 `app/api/test/route.ts` 提取**：

1. 配置规范化
2. 模型创建
3. 执行测试请求
4. 返回结果

**较简单，无流式需求**。

### 1.5 实现健康检查处理器 (`handlers/health.ts`)

**极简实现**：

```typescript
function handleHealth(): HandlerResult<HealthResponse> {
  return {
    success: true,
    data: { ok: true, timestamp: Date.now() },
  };
}
```

### 1.6 重构现有 Route Handlers

修改 `app/api/*/route.ts`，作为薄适配层：

```typescript
// app/api/chat/route.ts
import { handleChat } from "@/app/lib/api-core";

export async function POST(req: NextRequest) {
  const result = await handleChat(
    { body: await req.json(), signal: req.signal },
    {
      socketIO: global.io,
      pendingRequests: global.pendingRequests,
      emitToolExecute: global.emitToolExecute,
    },
  );

  if (!result.success) {
    return NextResponse.json(result.error, { status: result.error.status });
  }

  return result.stream
    ? new Response(result.stream)
    : NextResponse.json(result.data);
}
```

## 文件变更清单

| 操作 | 文件                                  | 说明           |
| ---- | ------------------------------------- | -------------- |
| 新增 | `app/lib/api-core/types.ts`           | 共享类型定义   |
| 新增 | `app/lib/api-core/context.ts`         | 处理器上下文   |
| 新增 | `app/lib/api-core/handlers/chat.ts`   | 聊天处理器     |
| 新增 | `app/lib/api-core/handlers/test.ts`   | 测试处理器     |
| 新增 | `app/lib/api-core/handlers/health.ts` | 健康检查处理器 |
| 新增 | `app/lib/api-core/index.ts`           | 统一导出       |
| 修改 | `app/api/chat/route.ts`               | 调用共享处理器 |
| 修改 | `app/api/test/route.ts`               | 调用共享处理器 |
| 修改 | `app/api/health/route.ts`             | 调用共享处理器 |

## 验收标准

- [ ] `pnpm run dev` 启动后，聊天功能正常
- [ ] `/api/test` 连接测试正常
- [ ] `/api/health` 健康检查正常
- [ ] 无代码重复，Route Handlers 仅做适配
- [ ] 类型安全，无 `any` 类型泄露

## 注意事项

1. **保持向后兼容**：Route Handlers 的对外接口（请求/响应格式）不变
2. **渐进式重构**：可先重构简单的 health/test，再处理复杂的 chat
3. **测试覆盖**：每完成一个处理器，立即手动验证功能
4. **helpers 模块**：`app/api/chat/helpers/` 保持不变，被 `handlers/chat.ts` 复用

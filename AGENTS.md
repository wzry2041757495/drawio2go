# DrawIO2Go - AI 代理开发指南

## 项目概述

基于 Electron + Next.js + HeroUI 构建的跨平台 DrawIO 编辑器应用。

### 核心技术栈
- **前端框架**: Next.js 15 (App Router) + React 19
- **UI 库**: HeroUI v3 (Alpha) - 复合组件模式
- **样式**: Tailwind CSS v4 (⚠️ 必须 v4，v3 不兼容)
- **DrawIO 集成**: 原生 iframe 实现
- **桌面应用**: Electron 38.x
- **语言**: TypeScript
- **主题**: 现代扁平化设计 (#3388BB 蓝色主题)

### 项目结构
```
app/
├── components/         # React 组件库 [详细文档 → app/components/AGENTS.md]
│   ├── DrawioEditorNative.tsx    # DrawIO 编辑器（原生 iframe + PostMessage）
│   ├── DrawioEditor.tsx          # DrawIO 编辑器（react-drawio 备用）
│   ├── BottomBar.tsx             # 底部工具栏
│   ├── UnifiedSidebar.tsx        # 统一侧边栏容器
│   ├── SettingsSidebar.tsx       # 设置侧边栏
│   └── ChatSidebar.tsx           # 聊天侧边栏（@ai-sdk/react）
├── lib/                # 工具库 [详细文档 → app/lib/AGENTS.md]
│   └── drawio-tools.ts          # DrawIO XML 操作工具集
├── types/              # 类型定义 [详细文档 → app/types/AGENTS.md]
│   └── drawio-tools.ts          # DrawIO 工具类型定义
├── layout.tsx          # 根布局
├── page.tsx            # 主页面
└── globals.css         # 全局样式

electron/               # 桌面应用 [详细文档 → electron/AGENTS.md]
├── main.js             # Electron 主进程
└── preload.js          # 预加载脚本（IPC 桥接）
```

## 开发准则

### 1. HeroUI v3 使用规范
- **复合组件**: 使用 `Card.Root`, `Card.Header`, `Card.Content` 等
- **事件处理**: 使用 `onPress` 代替 `onClick`
- **客户端指令**: 带交互的组件必须添加 `"use client"`
- **无 Provider**: HeroUI v3 不需要全局 Provider 包裹

### 2. Tailwind CSS v4 配置
- ⚠️ 必须使用 v4 版本（v3 不兼容）
- `globals.css` 使用 `@import "tailwindcss"`
- PostCSS 配置使用 `@tailwindcss/postcss`

### 3. 状态持久化
- **localStorage**: `currentDiagram`, `defaultPath`, `sidebarWidth`
- **React State**: 组件内临时状态
- **保存策略**: 自动保存到 localStorage，手动保存到文件系统

### 4. 包开发信息获取
- **首选 context7**: 获取任何第三方包的开发信息时，必须优先使用 `context7` MCP 工具
- **工作流程**: 先调用 `resolve-library-id` 获取包ID，再调用 `get-library-docs` 获取最新文档
- **适用场景**: 新增包、使用包的API、版本升级、遇到兼容性问题时

### 5. Socket.IO 工具调用架构
- **DrawIO 工具**: 通过 Socket.IO 转发到前端执行（需要浏览器环境）
- **其他工具**: 可直接在后端执行（未来扩展接口）
- **执行流程**:
  1. AI 调用工具 → `drawio-ai-tools.ts` 的 `execute` 函数
  2. `executeToolOnClient` 生成 requestId，通过 Socket.IO 发送到前端
  3. 前端 `useDrawioSocket` Hook 接收请求，执行实际操作
  4. 前端通过 Socket.IO 返回结果
  5. 后端 Promise resolve，返回结果给 AI
- **超时机制**: 默认 30 秒，可配置
- **错误处理**: 前端执行失败会返回详细错误信息给 AI

### 6. 检查测试
- 主动调用`getDiagnostics`工具获得语法错误检查信息，避免在编译时才处理语法错误
- 完成相关里程碑后，使用`web-function-tester`子代理进行页面功能测试

## 开发命令

使用pnpm作为包管理系统

```bash
pnpm run dev              # Socket.IO + Next.js 开发服务器 (http://localhost:3000)
pnpm run electron:dev     # Electron + Socket.IO + Next.js 开发模式
pnpm run build            # 构建 Next.js 应用
pnpm run start            # 生产环境启动 (Socket.IO + Next.js)
pnpm run electron:build   # 构建 Electron 应用 (输出到 dist/)
```

⚠️ **重要**: 不能使用 `next dev` 命令，必须使用 `pnpm run dev` 启动自定义服务器（包含 Socket.IO）

## 常见问题速查

### 1. HeroUI v3 Alpha 警告
- ✅ 正常现象，v3 仍在 alpha 阶段
- 📖 使用 `context7` MCP 工具查询最新 API：`resolve-library-id('heroui-react')` → `get-library-docs('/heroui/react')`

### 2. Tailwind 样式不生效
- ✅ 检查 `globals.css` 导入顺序: Tailwind → HeroUI
- ✅ 确认使用 Tailwind v4 配置

### 3. context7 使用指南
- **查询包信息**: `resolve-library-id('包名')` 获取包ID
- **获取文档**: `get-library-docs('包ID')` 获取最新开发文档
- **支持格式**: 包ID格式如 `/heroui/react`, `/vercel/next.js/v14.3.0`
- **优势**: 获得最新、准确的API文档，避免使用过时信息

### 4. React 版本要求
- ⚠️ HeroUI v3 需要 React 19+
- ✅ 检查 `package.json`: `"react": "^19.0.0"`

### 5. DrawIO 在 Electron 中不显示
👉 详细解决方案见 `electron/AGENTS.md` - "DrawIO iframe 不显示" 章节

## 子包文档导航

| 模块 | 路径 | 主要内容 |
|------|------|----------|
| **React 组件** | `app/components/AGENTS.md` | 所有 UI 组件的详细 API 和使用规范 |
| **XML 工具集** | `app/lib/AGENTS.md` | DrawIO XML 操作的完整工具文档 |
| **类型定义** | `app/types/AGENTS.md` | TypeScript 类型的完整说明 |
| **桌面应用** | `electron/AGENTS.md` | Electron 配置、安全策略和调试指南 |

## 最近更新

### 2025-11-03 - 会话消息错位问题修复
- ✅ **核心问题**: 修复 `ChatSidebar.tsx` 中严重的竞态条件问题
- ✅ **问题场景**: 用户在会话A发送消息后切换到会话B，AI响应会错误保存到会话B
- ✅ **修复方案**: 使用 `sendingSessionIdRef` 在发送时捕获会话ID，确保 `onFinish` 回调使用正确的目标会话
- ✅ **关键改进**:
  - 发送消息时记录目标会话ID到 ref (`submitMessage` 函数)
  - `onFinish` 回调使用记录的会话ID而非当前的 `activeSession.id`
  - 增强错误处理和会话存在性验证
  - 开发模式下检测会话切换并警告
  - 发送失败时正确清理状态
- ✅ **代码位置**: `app/components/ChatSidebar.tsx:248-311`
- ✅ **技术方案**: 闭包 + useRef 解决异步回调中的状态竞态问题
- ✅ **测试验证**: 构建通过，逻辑验证正确

### 2025-11-02 - OpenAI Compatible 迁移
- ✅ **架构重构**: 将 LLM API 调用从 `@ai-sdk/openai` 迁移到 `@ai-sdk/openai-compatible`
- ✅ **供应商类型更新**:
  - `openai-reasoning`: 使用 `@ai-sdk/openai`（专用于 OpenAI Reasoning 模型如 o1/o3）
  - `openai-compatible`: 使用 `@ai-sdk/openai-compatible`（通用 OpenAI 兼容服务）
  - `deepseek`: 使用 `@ai-sdk/openai-compatible`（DeepSeek API）
  - ~~移除旧类型~~: `openai`, `openai-response`, `anthropic`
- ✅ **向后兼容**: 旧的 provider 类型自动映射到 `openai-compatible`
- ✅ **API 路由更新**: `/api/chat` 和 `/api/test` 根据 providerType 自动选择合适的 provider
- ✅ **设置界面**: 更新供应商选项说明，更清晰的用户引导
- ✅ **文档**: 新增依赖 `@ai-sdk/openai-compatible`
- ⚡ **优势**: 支持更多 OpenAI 兼容服务（LM Studio、本地模型服务等），统一的架构易于扩展

### 2025-11-02 - 思考框功能（Thinking Block）
- ✅ 新增 ThinkingBlock 组件，用于展示思考类模型的推理过程
- ✅ 支持两种状态：思考中（脉动动画）和思考完成（静态）
- ✅ 默认折叠，可手动展开查看详细思考内容
- ✅ 低调的灰色设计，不抢夺注意力
- ✅ 集成到 ChatSidebar 消息渲染流程中
- ✅ 完整的 CSS 动画支持（脉动边框、滑动展开）
- ✅ 深色模式适配
- ✅ 正确从 `message.parts` 数组中提取 `ReasoningUIPart` 类型数据
- ✅ 支持流式传输时的实时状态判断（`state: 'streaming' | 'done'`）
- 📦 依赖 AI SDK 5.0+ 的 reasoning 字段支持（默认 `sendReasoning: true`）

### 2025-11-02 - Base64 解码前移优化
- ✅ 新增 `saveDrawioXML` 统一保存函数，确保 localStorage 永远存储解码后的纯 XML
- ✅ 所有写入 localStorage 的操作（DrawIO 自动保存、文件加载、AI 工具替换）都自动解码 base64
- ✅ 解决保存到文件时可能出现 base64 编码内容的问题
- ✅ 重构 `replaceDrawioXML` 和 `batchReplaceDrawioXML` 使用统一保存函数
- ✅ 优化数据流：DrawIO 编辑器 → 自动解码 → localStorage（纯 XML）→ 文件保存（纯 XML）

### 2025-10-31 - LLM 配置供应商切换
- ✅ 设置侧边栏支持选择 AI 请求供应商（OpenAI Responses/Chat、DeepSeek 等）
- ✅ 全局统一通过 `@ai-sdk/openai` 发送请求，移除旧式 REST 手写调用
- ✅ `/api/chat` 与 `/api/test` 兼容历史配置并自动规范化 API 地址

### 2025-10-31 - 聊天界面增强
- ✅ 聊天消息支持 Markdown 渲染（含代码块、列表、引用与链接）
- ✅ 工具调用以可展开状态卡片呈现，显示进行中/成功/失败并支持查看详细输入输出

### 2025-10-31 - 开发准则更新
- ✅ 明确要求使用 context7 获取包开发信息
- ✅ 添加 context7 使用工作流程和详细指南
- ✅ 优化开发准则结构，提高开发效率

### 2025-10-31 - 聊天消息格式修复
- ✅ `/app/api/chat/route.ts` 现在将前端传入的 `UIMessage[]` 转换为模型可用的 `ModelMessage[]`，修复 "Invalid prompt: The messages must be a ModelMessage[]" 报错

### 2025-11-02 - Socket.IO 工具调用架构重构
- ✅ **通讯机制**: 从前端 `onToolCall` 拦截改为 Socket.IO 双向通讯
- ✅ **执行模式**: 后端同步等待前端执行结果，确保 AI 对话流程完整
- ✅ **架构优势**:
  - 清晰的前后端职责分离
  - 统一的错误处理和超时机制
  - 后端可感知工具执行状态
  - 为未来后端工具预留接口
- ✅ **新增文件**:
  - `server.js` - Socket.IO 服务器 + Next.js 集成
  - `app/lib/tool-executor.ts` - 工具执行路由器
  - `app/types/socket-protocol.ts` - Socket.IO 通讯协议
  - `app/types/global.d.ts` - 全局类型声明
  - `app/hooks/useDrawioSocket.ts` - 前端 Socket.IO Hook
- ✅ **修改文件**:
  - `app/lib/drawio-ai-tools.ts` - 使用 `executeToolOnClient` 替代占位符
  - `app/api/chat/route.ts` - 移除 Edge Runtime，使用 Node.js Runtime
  - `app/components/ChatSidebar.tsx` - 删除 `onToolCall` 逻辑
  - `app/page.tsx` - 集成全局 Socket.IO 连接
- ✅ **新增依赖**: socket.io, socket.io-client, uuid

### 2025-10-31 - DrawIO 工具调用前端化 [已废弃]
- ⚠️ 此版本已被 Socket.IO 架构替代
- ~~`drawio-ai-tools` 不再直接访问浏览器 API，统一返回前端路由占位~~
- ~~`ChatSidebar` 使用 `onToolCall + addToolResult` 在客户端执行 DrawIO XML 相关操作~~
- ~~聊天界面新增工具执行状态展示，失败会提示错误文本~~

### 2025-10-27 - DrawIO XML 工具集
- ✅ 新增 XML 操作工具集 (`app/lib/drawio-tools.ts`)
- ✅ 完整的 TypeScript 类型支持
- ✅ XML 安全验证和事件驱动更新

### 2025-10-26 - 侧边栏简化设计
- ✅ 删除冗余 UI 元素，完全扁平化设计
- ✅ 智能浮动按钮，仅在有修改时显示
- ✅ 统一侧边栏架构完成

### 2025-10-26 - 聊天页面重构
- ✅ 统一侧边栏架构，一体化聊天界面
- ✅ HeroUI v3 复合组件模式实现
- ✅ 扁平化设计，#3388BB 主题色

## 项目仓库

**GitHub**: https://github.com/Menghuan1918/drawio2go

---

*最后更新: 2025-11-03*

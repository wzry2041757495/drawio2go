# DrawIO2Go - AI 代理开发指南

重要的事情说三遍：
!重要：目前项目还未上线，处于内部开发阶段，不需要考虑兼容旧代码，直接执行破坏性更新
!重要：目前项目还未上线，处于内部开发阶段，不需要考虑兼容旧代码，直接执行破坏性更新
!重要：目前项目还未上线，处于内部开发阶段，不需要考虑兼容旧代码，直接执行破坏性更新

## 项目概述

基于 Electron + Next.js + HeroUI 构建的跨平台 DrawIO 编辑器应用。

### 核心技术栈

- **前端框架**: Next.js 15 (App Router) + React 19
- **UI 库**: HeroUI v3 (Beta) - 复合组件模式
- **样式**: Tailwind CSS v4 (⚠️ 必须 v4，v3 不兼容)
- **DrawIO 集成**: 原生 iframe 实现
- **桌面应用**: Electron 38.x
- **语言**: TypeScript
- **主题**: 现代扁平化设计，Material Design风格 (#3388BB 蓝色主题)

### 设计系统规范

> 详细文档请参考 `app/styles/AGENTS.md`

**设计令牌（Design Tokens）**:

- **圆角**: 4px (小) / 8px (标准) / 12px (大)
- **间距**: 4px 基准（4/8/16/24/32px）
- **阴影**: Material Design 4 层阴影系统
- **动画**: 150ms (快) / 200ms (标准) / 300ms (慢)

**核心原则**:

- ✅ 使用 CSS 变量 (`var(--radius)`, `var(--shadow-2)`)
- ✅ 扁平化设计，避免渐变和复杂效果
- ✅ 简单交互反馈，避免干扰性动画（脉冲、浮动）
- ❌ 禁止硬编码颜色、尺寸和阴影值

### 项目结构

```
app/
├── components/         # React 组件库 [详细文档 → app/components/AGENTS.md]
│   ├── DrawioEditorNative.tsx    # DrawIO 编辑器（原生 iframe + PostMessage）
│   ├── TopBar.tsx                # 顶栏组件
│   ├── UnifiedSidebar.tsx        # 统一侧边栏容器
│   ├── SettingsSidebar.tsx       # 设置侧边栏
│   ├── ChatSidebar.tsx           # 聊天侧边栏主组件（@ai-sdk/react）
│   ├── VersionSidebar.tsx        # 版本侧边栏主组件
│   ├── chat/                     # 聊天组件模块化架构（12个子组件）
│   ├── settings/                 # 设置相关子组件
│   └── version/                  # 版本管理子组件
│       ├── VersionCard.tsx       # 版本卡片（折叠式）
│       ├── VersionTimeline.tsx   # 版本时间线
│       ├── CreateVersionDialog.tsx # 创建版本对话框
│       └── PageSVGViewer.tsx     # 多页 SVG 查看器
├── lib/                # 工具库 [详细文档 → app/lib/AGENTS.md]
│   ├── drawio-tools.ts          # DrawIO XML 操作工具集
│   ├── drawio-ai-tools.ts       # DrawIO AI 工具调用接口
│   ├── drawio-xml-service.ts    # DrawIO XML 转接层（XPath 查询）
│   ├── tool-executor.ts         # 工具执行路由器
│   ├── svg-export-utils.ts      # 多页面 SVG 导出工具
│   ├── svg-smart-diff.ts        # SVG 智能差异对比引擎
│   ├── config-utils.ts          # LLM 配置规范化工具
│   └── storage/                 # 统一存储抽象层
│       ├── adapter.ts           # 存储适配器抽象类
│       ├── indexeddb-storage.ts # IndexedDB 实现（Web）
│       ├── sqlite-storage.ts    # SQLite 实现（Electron）
│       ├── storage-factory.ts   # 存储实例工厂
│       ├── current-project.ts   # 当前工程 ID 持久化工具
│       ├── xml-version-engine.ts # XML 版本恢复引擎（Diff 重放）
│       ├── page-metadata.ts     # 页面元数据提取工具
│       ├── constants.ts         # 常量定义（WIP_VERSION 等）
│       ├── types.ts             # 存储层类型定义
│       └── index.ts             # 统一导出
├── types/              # 类型定义 [详细文档 → app/types/AGENTS.md]
│   ├── chat.ts                  # 聊天相关类型
│   ├── drawio-tools.ts          # DrawIO 工具类型
│   ├── socket-protocol.ts       # Socket.IO 协议类型
│   └── global.d.ts              # 全局类型声明
├── hooks/              # React Hooks [详细文档 → app/hooks/AGENTS.md]
│   ├── useDrawioSocket.ts       # Socket.IO 通讯 Hook
│   ├── useStorageSettings.ts    # 设置持久化 Hook
│   ├── useStorageProjects.ts    # 项目管理 Hook
│   ├── useCurrentProject.ts     # 当前工程管理 Hook（超时保护 + 自动兜底）
│   ├── useStorageConversations.ts   # 会话管理 Hook
│   ├── useStorageXMLVersions.ts     # XML 版本管理 Hook
│   ├── useVersionCompare.ts     # 版本对比状态管理 Hook
│   └── useDrawioEditor.ts       # DrawIO 编辑器操作封装 Hook
├── api/                # API 路由
│   ├── chat/                    # 聊天 API 路由
│   └── test/                    # 测试 API 路由
├── styles/             # 模块化样式系统 [详细文档 → app/styles/AGENTS.md]
│   ├── base/                    # 基础样式（reset、变量）
│   ├── components/              # 组件样式
│   ├── layout/                  # 布局样式
│   ├── themes/                  # 主题样式
│   └── utilities/               # 工具样式
├── page.tsx            # 主页面
├── layout.tsx          # 根布局
└── globals.css         # 全局样式入口

electron/               # 桌面应用 [详细文档 → electron/AGENTS.md]
server.js              # Socket.IO 服务器 + Next.js 集成
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

### 3. 统一存储架构

- **存储抽象层**: `app/lib/storage/` - 适配器模式统一存储接口
- **自动适配**:
  - **Electron**: SQLite 数据库（通过 better-sqlite3）
  - **Web**: IndexedDB（通过 idb）
- **存储表结构**:
  - `Projects`: 项目元数据（uuid, name, description）
  - `XMLVersions`: XML 版本管理（项目关联，语义化版本）
  - `Conversations`: 聊天会话（标题、消息、时间戳）
  - `Settings`: 应用设置（LLM 配置、默认路径、侧边栏宽度等）
- **React Hooks**: 封装统一存储访问（useStorageSettings、useStorageProjects 等）
- **保存策略**: 自动保存到统一存储层，手动导出到文件系统

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

- 主动调用`pnpm lint`获得语法错误检查信息，避免在编译时才处理语法错误

## 开发命令

使用pnpm作为包管理系统

```bash
pnpm run dev              # Socket.IO + Next.js 开发服务器 (http://localhost:3000)
pnpm run electron:dev     # Electron + Socket.IO + Next.js 开发模式
pnpm run build            # 构建 Next.js 应用
pnpm run start            # 生产环境启动 (Socket.IO + Next.js)
pnpm run electron:build   # 构建 Electron 应用 (输出到 dist/)
pnpm lint                 # ESLint 检查 + TypeScript 类型检查
pnpm format               # 使用 Prettier 格式化所有代码
```

⚠️ **重要**: 不能使用 `next dev` 命令，必须使用 `pnpm run dev` 启动自定义服务器（包含 Socket.IO）

## 常见问题

### HeroUI v3 相关

- v3 仍在 alpha 阶段，警告正常
- 使用 `context7` MCP 工具查询最新 API
- 需要 React 19+ 和 Tailwind CSS v4

### Electron 问题

- DrawIO 不显示？详见 `electron/AGENTS.md`

## 子包文档导航

| 模块            | 路径                       | 主要内容                                 |
| --------------- | -------------------------- | ---------------------------------------- |
| **React 组件**  | `app/components/AGENTS.md` | 所有 UI 组件的详细 API 和使用规范        |
| **React Hooks** | `app/hooks/AGENTS.md`      | 统一存储 Hooks 与 Socket.IO 通讯 Hook    |
| **样式系统**    | `app/styles/AGENTS.md`     | 设计令牌、Material Design 规范、最佳实践 |
| **XML 工具集**  | `app/lib/AGENTS.md`        | DrawIO XML 操作、存储层架构完整文档      |
| **类型定义**    | `app/types/AGENTS.md`      | TypeScript 类型的完整说明                |
| **桌面应用**    | `electron/AGENTS.md`       | Electron 配置、安全策略和调试指南        |

## 最近更新

### 核心架构（2025-11）

**统一存储系统**

- 适配器模式统一 SQLite（Electron）和 IndexedDB（Web）接口
- 版本控制：UUID 主键 + 关键帧/Diff 混合存储（diff-match-patch）
- WIP 草稿独立管理：永久关键帧，时间戳实时更新，独立于 Diff 链路
- 工程管理增强：超时保护、严格模式兼容、自动兜底机制

**Socket.IO 工具调用架构**

- 双向通讯：AI 工具调用 → Socket.IO 转发前端 → 返回结果
- 30秒超时机制，详细错误追溯

**LLM 集成**

- OpenAI Compatible 支持（Reasoning 模型 o1/o3、LM Studio、DeepSeek）
- 聊天消息带模型标记（`model_name` 字段）

### 版本管理系统（2025-11-12 ~ 2025-11-17）

**UI 现代化**

- Material Design 规范：4/8/12px 圆角、4 层阴影系统、4px 基准间距
- 扁平化设计：移除渐变、干扰性动画（脉冲/浮动）
- 紧凑化布局：折叠式版本卡片、时间线视觉优化
- 文本语义化变量：`--text-primary/secondary/tertiary`

**多页面 SVG 支持**

- 存储扩展：`page_count`、`page_names`、`preview_svg`、`pages_svg` 字段
- 全屏查看器：懒加载、键盘快捷键、滚轮缩放、拖拽平移
- 缩略图全屏查看：所有版本（单页/多页）的缩略图均可点击放大，悬停显示放大图标
- 可访问性：`role="button"`、键盘 Enter/Space 支持

**版本对比可视化**

- 智能差异模式（`smart` 视图）：基于 `data-cell-id` 自动匹配差异元素
  - 自动分类：匹配/变更/删除/新增
  - 视觉归一化：自动缩放对齐不同尺寸 SVG
  - 混合模式高亮：`mix-blend-mode` + `filter` 实现差异可视化
  - 覆盖率统计：匹配元素百分比
- 全屏对比弹层：左右/上下/叠加三种布局，同步缩放/平移
- 快速对比入口：最新 vs 上一版本快捷按钮

**版本操作增强**

- 版本动态切换：侧栏直接切换到历史版本编辑
- SVG 导出增强：自定义选项、多页面导出优化

### 智能对比算法（2025-11-17）

- `app/lib/svg-smart-diff.ts` 现会收集所有匹配/变更的 `data-cell-id` 元素，通过临时挂载到 DOM 后的 `getBBox()` 汇总真实包围盒。
- 基于包围盒尺寸动态计算等比缩放因子（0.25x ~ 4x），以保持两侧差异视图在统一坐标系内尽量重叠。
- 在统一的归一化画布上根据包围盒中心点求取平均目标中心，对两个版本分别添加平移补偿，将核心差异区域自动对齐。

### 界面交互优化（2025-11-13 ~ 2025-11-14）

**顶栏与侧栏重构**

- 顶栏统一操作区：选区指示器（左）+ 工程切换（中）+ 保存/侧栏切换（右）
- 统一侧栏多 Tab：聊天/设置/版本切换（HeroUI `Tabs` 实现）
- 选区状态显示：Electron 实时显示选中对象数量（Web 受限）

**HeroUI v3 组件迁移**

- Alert 组件：聊天错误提示标准化
- Skeleton 占位：统一加载状态（ProjectSelector、MessageList、Version Timeline）
- Tabs 组件：侧栏标签页切换

**聊天界面优化**

- 组件模块化：拆分为 12 个独立组件（`app/components/chat/`）
- 全宽 AI 回复布局 + 气泡式用户消息
- 模型信息条：Lucide 图标 + 模型名 + 时间戳

### 关键修复（2025-11-16）

**DrawIO 初始化加载**

- 修复 iframe 加载阻塞问题（e33efb5 之后）
- 新增 `pendingLoadQueue`：iframe 未 ready 时缓存请求，`init` 后自动回放
- 状态对齐：`loadProjectXml` 返回已加载 XML，保证保存/回滚场景一致性

### 统一存储层更新（2025-11-17）

- **对话 API**：`getConversationsByXMLVersion` 全面下线，所有会话按 `project_uuid` 维度查询，前端 Hook 与 Electron IPC 均已同步。
- **页面元数据校验**：新增 `app/lib/storage/page-metadata-validators.ts`，统一 `page_count`、`page_names` 解析规则与 SVG Blob（8MB）体积校验，IndexedDB/SQLite 复用同一逻辑。
- **迁移体系**：IndexedDB 初始化通过 `storage/migrations/indexeddb/v1.ts` 执行幂等迁移，SQLite 主进程通过 `electron/storage/migrations/` 自动执行 v1 迁移并更新 `user_version`，禁止再删除/重建存储。

_最后更新: 2025-11-17_

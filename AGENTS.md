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

## 核心开发准则

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

## 开发命令

```bash
npm run dev              # Next.js 开发服务器 (http://localhost:3000)
npm run electron:dev     # Electron + Next.js 开发模式
npm run build            # 构建 Next.js 应用
npm run electron:build   # 构建 Electron 应用 (输出到 dist/)
```

## 常见问题速查

### 1. HeroUI v3 Alpha 警告
- ✅ 正常现象，v3 仍在 alpha 阶段
- 📖 优先使用 `context7` MCP 工具查询最新 API

### 2. Tailwind 样式不生效
- ✅ 检查 `globals.css` 导入顺序: Tailwind → HeroUI
- ✅ 确认使用 Tailwind v4 配置

### 3. React 版本要求
- ⚠️ HeroUI v3 需要 React 19+
- ✅ 检查 `package.json`: `"react": "^19.0.0"`

### 4. DrawIO 在 Electron 中不显示
👉 详细解决方案见 `electron/AGENTS.md` - "DrawIO iframe 不显示" 章节

## 子包文档导航

| 模块 | 路径 | 主要内容 |
|------|------|----------|
| **React 组件** | `app/components/AGENTS.md` | 所有 UI 组件的详细 API 和使用规范 |
| **XML 工具集** | `app/lib/AGENTS.md` | DrawIO XML 操作的完整工具文档 |
| **类型定义** | `app/types/AGENTS.md` | TypeScript 类型的完整说明 |
| **桌面应用** | `electron/AGENTS.md` | Electron 配置、安全策略和调试指南 |

## 最近更新

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

*最后更新: 2025-10-27*
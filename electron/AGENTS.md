# Electron 桌面应用

## 概述

基于 Electron 38.x 构建的跨平台桌面应用，提供文件系统访问和原生桌面功能。

### 环境检测

在 React 组件中检测 Electron 环境：

```typescript
const isElectron = typeof window !== "undefined" && (window as any).electron;

if (isElectron) {
  // Electron 特定功能
  const folderPath = await window.electron.selectFolder();
}
```

### 文件操作流程

- **保存流程**:
  1. 检查是否有默认路径
  2. 有默认路径：自动生成文件名保存
  3. 无默认路径：弹出保存对话框
  4. 格式：`diagram_YYYY-MM-DDTHH-MM-SS.drawio`
- **加载流程**:
  1. 弹出文件选择对话框
  2. 读取文件内容
  3. 返回 XML 内容给前端

## 文件结构

```
electron/
├── main.js                    # Electron 主进程入口
├── preload.js                 # 预加载脚本，安全暴露 IPC API
└── storage/
    ├── sqlite-manager.js      # SQLite 数据库管理器（使用 better-sqlite3）
    ├── migrations/            # 数据库迁移脚本
    │   ├── index.js           # 迁移入口
    │   └── v1.js              # V1 迁移
    └── shared/                # 共享常量（打包时需包含）
        ├── constants-shared.js    # 存储常量
        └── default-diagram-xml.js # 默认图表 XML
```

## 核心功能

### 1. 主进程 (main.js)

#### 窗口配置

- **尺寸**: 1200x800 像素
- **图标**: `/public/icon.png`
- **Web 首选项**:
  - 开发模式: `webSecurity: false`, `sandbox: false`
  - 生产模式: `webSecurity: true`, `sandbox: true`

#### IPC API (通过 preload.js 暴露)

**文件操作 API (`window.electron`)**:

- `selectFolder()`: 选择文件夹
- `saveDiagram(xml, path)`: 保存图表文件
- `loadDiagram()`: 加载图表文件
- `openExternal(url)`: 打开外部链接
- `checkForUpdates()`: 检查 GitHub Release 更新（失败返回 null）
- `openReleasePage(url)`: 打开 Release 页面
- `onUpdateAvailable(callback)`: 订阅自动更新检查结果（接收 `update:available` 事件，返回取消订阅函数）
- `showSaveDialog(options)`: 显示保存对话框
- `showOpenDialog(options)`: 显示打开对话框
- `writeFile(filePath, data)`: 写入文件
- `readFile(filePath)`: 读取文件
- `enableSelectionWatcher()`: 启用 DrawIO 选区监听

**文件系统 API (`window.electronFS`)**:

- `readFile(filePath)`: 读取 userData 目录下的二进制文件（返回 ArrayBuffer，主要用于附件 `file_path`）

**存储 API (`window.electronStorage`)**:

- `initialize()`: 初始化存储
- Settings: `getSetting`, `setSetting`, `deleteSetting`, `getAllSettings`
- Projects: `getProject`, `createProject`, `updateProject`, `deleteProject`, `getAllProjects`
- XMLVersions: `getXMLVersion`, `createXMLVersion`, `getXMLVersionsByProject`, `getXMLVersionSVGData`, `updateXMLVersion`, `deleteXMLVersion`
- Conversations: `getConversation`, `createConversation`, `updateConversation`, `deleteConversation`, `batchDeleteConversations`, `exportConversations`, `getConversationsByProject`
- Messages: `getMessagesByConversation`, `createMessage`, `deleteMessage`, `createMessages`

> 注意：当 key 为 `settings.llm.providers`（或 `llm.providers`）时，`getSetting()` 返回的 JSON 中 `apiKey` 字段为**解密后的明文**（用于 UI 编辑与 API Route 调用）。

#### 安全策略

- **CSP 配置**: 仅允许 `embed.diagrams.net` iframe
- **开发模式**: 宽松的安全策略，便于调试
- **生产模式**: 严格的安全限制

#### 密钥与配置安全模型（必须理解）

本项目的“密钥安全”目标是：**保证密钥在磁盘上加密存储（at-rest）**，并对“解密后密钥暴露面”给出清晰边界说明。

**事实与限制（架构决定）**：

- `safeStorage` 的加/解密能力只能在 Electron 进程中使用（主进程/预加载脚本）。
- LLM 调用发生在 Next.js API Route（内嵌服务器子进程）中，该进程无法直接使用 `safeStorage`。
- 因此 API Route 所需的 `apiKey` 目前来自**渲染进程提交的请求体**（UI 读取配置后随请求传入），这意味着渲染进程必须能够拿到**解密后的** API Key。
- 结论：我们无法在架构上彻底阻止渲染进程获取解密后的密钥；一旦渲染进程发生 XSS/任意脚本执行，就可能外传密钥（这是当前架构的安全边界）。

**我们做了什么（可验证）**：

- ✅ **落盘加密**：仅对设置项 `settings.llm.providers`（兼容历史 `llm.providers`）中的 `ProviderConfig[].apiKey` 做加密存储/解密读取。
  - 具体实现位于 `electron/storage/sqlite-manager.js`（前缀 `enc:v1:` + `safeStorage.encryptString()` / `decryptString()`）。
- ✅ **显式暴露面说明**：`electron/preload.js` 会注释说明为何 `window.electronStorage.getSetting()` 需要保留“返回解密后的 providers apiKey”的能力。

**使用规范（避免扩大风险面）**：

- 只在“设置面板/模型配置”场景读取 providers；不要在聊天/日志/错误上报等路径传播 `apiKey`。
- 不要把 providers 配置（尤其是 apiKey）打印到 console、toast、logger 或持久化到其它文件。
- 避免新增“批量导出敏感配置”的 IPC API（例如 dump / exportAll），否则会放大 XSS 的影响面。

### 2. 预加载脚本 (preload.js)

#### 安全桥接

通过 `contextBridge` 安全地暴露主进程 API：

```javascript
// 文件操作 API
contextBridge.exposeInMainWorld("electron", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  saveDiagram: (xml, path) => ipcRenderer.invoke("save-diagram", xml, path),
  loadDiagram: () => ipcRenderer.invoke("load-diagram"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  openReleasePage: (url) => ipcRenderer.invoke("update:openReleasePage", url),
  onUpdateAvailable: (callback) => {
    const listener = (_event, result) => callback(result);
    ipcRenderer.on("update:available", listener);
    return () => ipcRenderer.removeListener("update:available", listener);
  },
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
  writeFile: (filePath, data) =>
    ipcRenderer.invoke("write-file", filePath, data),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  enableSelectionWatcher: () => ipcRenderer.invoke("enable-selection-watcher"),
});

// 存储 API
contextBridge.exposeInMainWorld("electronStorage", {
  initialize: () => ipcRenderer.invoke("storage:initialize"),
  // Settings, Projects, XMLVersions, Conversations, Messages...
});
```

### 3. SQLite 存储管理器 (storage/sqlite-manager.js)

**功能**: 管理 Electron 环境下的 SQLite 数据库操作

- 使用 `better-sqlite3` 同步 API
- 数据库文件位于 `userData/drawio2go.db`
- 支持事务操作保证原子性
- 初始化时内联建表（v1 Schema，含流式字段），`pragma user_version = 1`

## 开发配置

### 开发模式

- 自动打开开发者工具
- 禁用安全限制便于调试
- 支持 DrawIO iframe 显示

### 生产构建

- 启用完整安全限制
- CSP 仅允许必要的域名
- 优化的性能和安全性

## 环境检测

在 React 组件中检测 Electron 环境：

```typescript
const isElectron = typeof window !== "undefined" && (window as any).electron;

if (isElectron) {
  // Electron 特定功能
  const folderPath = await window.electron.selectFolder();
}
```

## 文件操作

### 保存流程

1. 检查是否有默认路径
2. 有默认路径：自动生成文件名保存
3. 无默认路径：弹出保存对话框
4. 格式：`diagram_YYYY-MM-DDTHH-MM-SS.drawio`

### 加载流程

1. 弹出文件选择对话框
2. 读取文件内容
3. 返回 XML 内容给前端

## 构建配置

### 内嵌服务器架构（2025-12-15 更新）

**生产模式**：Electron 主进程通过 `fork()` 启动内嵌的 Next.js + Socket.IO 服务器

```javascript
// electron/main.js
async function startEmbeddedServer() {
  const port = await findAvailablePort(3000); // 自动查找可用端口
  serverProcess = fork(serverPath, [], { env: { PORT: port } });
  // 监听 "Ready on" 输出确认启动成功
}
```

**关键特性**：

- 端口自动查找：避免 3000 端口被占用时的冲突
- 优雅关闭：SIGTERM/SIGINT 信号处理
- 路径解析：`asarUnpack` 解压的文件位于 `app.asar.unpacked/`

### electron-builder 配置

- **App ID**: `com.drawio2go.app`
- **产品名称**: DrawIO2Go
- **目标平台**:
  - Windows: NSIS
  - macOS: DMG
  - Linux: AppImage

### 构建命令

```bash
npm run electron:build  # 构建桌面应用
```

## 常见问题

### DrawIO iframe 不显示

**原因**: Electron 安全策略阻止外部 iframe

**解决方案**:

- 开发模式：设置 `webSecurity: false`
- 生产模式：配置 CSP 允许 `embed.diagrams.net`

**调试步骤**:

1. 打开 DevTools (开发模式自动打开)
2. 检查 Console: 查找 `✅ DrawIO iframe 初始化成功！`
3. 检查 Network: 确认 `embed.diagrams.net` 请求成功
4. 常见错误: `Refused to frame`, `ERR_BLOCKED_BY_CLIENT`

**生产环境**:

- ⚠️ 启用 `webSecurity: true`, `sandbox: true`
- ✅ CSP 仅允许 `frame-src https://embed.diagrams.net`

## 代码腐化清理记录

### 2025-12-08 清理

**执行的操作**：

- 将 Buffer ↔ Uint8Array 转换逻辑抽取为独立辅助函数，复用到文件读写与 IPC 返回路径。
- 主进程 `main.js` 清理重复转换代码，保持 API 签名不变。
- 文档补充本次清理，提示后续新增 IPC 时复用该工具函数。

**影响文件**：1 个（electron/main.js）

**下次关注**：

- 若新增二进制相关 IPC，优先复用转换工具并补充单测。
- 💡 可选: 自托管 DrawIO 静态文件

### 调试技巧

1. 开发模式自动打开 DevTools
2. 检查 Console 中的错误信息
3. 验证 CSP 配置是否正确
4. 确认网络请求是否成功

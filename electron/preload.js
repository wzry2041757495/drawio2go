const { contextBridge, ipcRenderer } = require("electron");

/**
 * 安全模型（密钥相关，务必阅读）
 *
 * 本项目的渲染进程运行的是 Next.js UI（第一方代码），主进程负责：
 * - 通过 `contextBridge` 暴露有限的 IPC API（本文件）
 * - 使用 `safeStorage` 对落盘的 API Key 做“加密存储 / 解密读取”
 *
 * 关键限制：
 * - LLM 调用发生在 Next.js API Route（内嵌服务器进程）中，该进程无法直接使用 Electron 的 `safeStorage`
 * - 因此 API Route 需要从“渲染进程提交的请求体”中拿到 **解密后的** `apiKey`
 * - 这导致我们无法在架构上彻底阻止渲染进程获取解密后的 API Key（例如读取 settings.llm.providers）
 *
 * 我们能保证与需要保证的东西：
 * - ✅ 落盘安全：SQLite settings 中的 `settings.llm.providers[].apiKey` 会被加密后再写入磁盘
 *   - 加解密逻辑在主进程侧的 `electron/storage/sqlite-manager.js` 中实现
 * - ✅ 清晰边界：本文件会对“哪些 API 可能暴露密钥”做显式注释，避免误用/误扩展
 * - ❗ 风险仍在：一旦渲染进程发生 XSS/任意脚本执行，攻击者可通过这些桥接 API 读取解密后的密钥并外传
 *
 * 因此：
 * - 把渲染进程视作“同信任域”而非强隔离安全边界（preload 不是机密隔离机制）
 * - 重点防御点是：避免渲染进程执行不受信任脚本、限制外部内容、审计 IPC 暴露面
 */

// 暴露安全的 API 到渲染进程
const electronApi = Object.freeze({
  // 选择文件夹
  selectFolder: () => ipcRenderer.invoke("select-folder"),

  // 保存图表
  saveDiagram: (xml, defaultPath) =>
    ipcRenderer.invoke("save-diagram", xml, defaultPath),

  // 加载图表
  loadDiagram: () => ipcRenderer.invoke("load-diagram"),

  // 打开外部链接
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  // 更新检查（GitHub Releases）
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  openReleasePage: (url) => ipcRenderer.invoke("update:openReleasePage", url),
  onUpdateAvailable: (callback) => {
    if (typeof callback !== "function") {
      return () => {};
    }

    const listener = (_event, result) => callback(result);
    ipcRenderer.on("update:available", listener);
    return () => ipcRenderer.removeListener("update:available", listener);
  },

  // 通用文件对话框和文件操作
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
  writeFile: (filePath, data) =>
    ipcRenderer.invoke("write-file", filePath, data),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),

  // 启用 DrawIO 选区监听
  enableSelectionWatcher: () => ipcRenderer.invoke("enable-selection-watcher"),
});

contextBridge.exposeInMainWorld("electron", electronApi);

// 暴露安全的二进制文件读取 API（主要用于附件）
// 约束：主进程会把路径限制在 userData 目录下，避免任意文件读取
const electronFSApi = Object.freeze({
  readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),
});

contextBridge.exposeInMainWorld("electronFS", electronFSApi);

// 暴露存储 API 到渲染进程（⚠️ 含密钥读取能力）
//
// 为什么必须暴露？
// - UI 需要展示/编辑 LLM Provider 配置（含 apiKey）
// - API Route 运行在内嵌服务器进程中，无法使用 `safeStorage`，因此调用 LLM 时的 apiKey 需要由渲染进程提交
//
// 结论：
// - `getSetting("settings.llm.providers")` 会返回 **解密后的** apiKey（由主进程 SQLiteManager 负责解密）
// - 这不是“安全漏洞修复点”，而是当前架构的安全边界：请把渲染进程视作可信代码执行域
//
// 注意事项：
// - 不要在非设置模块中滥用读取 providers（避免无意间把 apiKey 写入日志/上报/错误堆栈）
// - 避免扩展新的“批量读取敏感信息”API（如新增 dump/all），否则会放大 XSS 的影响面
const electronStorageApi = Object.freeze({
  // 初始化
  initialize: () => ipcRenderer.invoke("storage:initialize"),

  // Settings
  // ⚠️ 可能返回解密后的 API Key（仅 key=settings.llm.providers/llm.providers）
  getSetting: (key) => ipcRenderer.invoke("storage:getSetting", key),
  setSetting: (key, value) =>
    ipcRenderer.invoke("storage:setSetting", key, value),
  deleteSetting: (key) => ipcRenderer.invoke("storage:deleteSetting", key),
  // 注意：返回的是数据库中的原始值（通常对 providers 的 apiKey 为 enc:v1:...），不要把它当成“安全替代方案”
  getAllSettings: () => ipcRenderer.invoke("storage:getAllSettings"),

  // Projects
  getProject: (uuid) => ipcRenderer.invoke("storage:getProject", uuid),
  createProject: (project) =>
    ipcRenderer.invoke("storage:createProject", project),
  updateProject: (uuid, updates) =>
    ipcRenderer.invoke("storage:updateProject", uuid, updates),
  deleteProject: (uuid) => ipcRenderer.invoke("storage:deleteProject", uuid),
  getAllProjects: () => ipcRenderer.invoke("storage:getAllProjects"),

  // XMLVersions
  getXMLVersion: (id, projectUuid) =>
    ipcRenderer.invoke("storage:getXMLVersion", id, projectUuid),
  createXMLVersion: (version) =>
    ipcRenderer.invoke("storage:createXMLVersion", version),
  getXMLVersionsByProject: (projectUuid) =>
    ipcRenderer.invoke("storage:getXMLVersionsByProject", projectUuid),
  getXMLVersionSVGData: (id, projectUuid) =>
    ipcRenderer.invoke("storage:getXMLVersionSVGData", id, projectUuid),
  updateXMLVersion: (id, updates) =>
    ipcRenderer.invoke("storage:updateXMLVersion", id, updates),
  deleteXMLVersion: (id, projectUuid) =>
    ipcRenderer.invoke("storage:deleteXMLVersion", id, projectUuid),

  // Conversations
  getConversation: (id) => ipcRenderer.invoke("storage:getConversation", id),
  createConversation: (conversation) =>
    ipcRenderer.invoke("storage:createConversation", conversation),
  updateConversation: (id, updates) =>
    ipcRenderer.invoke("storage:updateConversation", id, updates),
  setConversationStreaming: (id, isStreaming) =>
    ipcRenderer.invoke("storage:setConversationStreaming", id, isStreaming),
  deleteConversation: (id) =>
    ipcRenderer.invoke("storage:deleteConversation", id),
  batchDeleteConversations: (ids) =>
    ipcRenderer.invoke("storage:batchDeleteConversations", ids),
  exportConversations: (ids) =>
    ipcRenderer.invoke("storage:exportConversations", ids),
  getConversationsByProject: (projectUuid) =>
    ipcRenderer.invoke("storage:getConversationsByProject", projectUuid),

  // Messages
  getMessagesByConversation: (conversationId) =>
    ipcRenderer.invoke("storage:getMessagesByConversation", conversationId),
  createMessage: (message) =>
    ipcRenderer.invoke("storage:createMessage", message),
  deleteMessage: (id) => ipcRenderer.invoke("storage:deleteMessage", id),
  createMessages: (messages) =>
    ipcRenderer.invoke("storage:createMessages", messages),

  // Attachments
  getAttachment: (id) => ipcRenderer.invoke("storage:getAttachment", id),
  createAttachment: (attachment) =>
    ipcRenderer.invoke("storage:createAttachment", attachment),
  deleteAttachment: (id) => ipcRenderer.invoke("storage:deleteAttachment", id),
  getAttachmentsByMessage: (messageId) =>
    ipcRenderer.invoke("storage:getAttachmentsByMessage", messageId),
  getAttachmentsByConversation: (conversationId) =>
    ipcRenderer.invoke("storage:getAttachmentsByConversation", conversationId),
});

contextBridge.exposeInMainWorld("electronStorage", electronStorageApi);

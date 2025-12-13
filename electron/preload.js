const { contextBridge, ipcRenderer } = require("electron");

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld("electron", {
  // 选择文件夹
  selectFolder: () => ipcRenderer.invoke("select-folder"),

  // 保存图表
  saveDiagram: (xml, defaultPath) =>
    ipcRenderer.invoke("save-diagram", xml, defaultPath),

  // 加载图表
  loadDiagram: () => ipcRenderer.invoke("load-diagram"),

  // 打开外部链接
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  // 通用文件对话框和文件操作
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
  writeFile: (filePath, data) =>
    ipcRenderer.invoke("write-file", filePath, data),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),

  // 启用 DrawIO 选区监听
  enableSelectionWatcher: () => ipcRenderer.invoke("enable-selection-watcher"),
});

// 暴露安全的二进制文件读取 API（主要用于附件）
// 约束：主进程会把路径限制在 userData 目录下，避免任意文件读取
contextBridge.exposeInMainWorld("electronFS", {
  readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),
});

// 暴露存储 API 到渲染进程
contextBridge.exposeInMainWorld("electronStorage", {
  // 初始化
  initialize: () => ipcRenderer.invoke("storage:initialize"),

  // Settings
  getSetting: (key) => ipcRenderer.invoke("storage:getSetting", key),
  setSetting: (key, value) =>
    ipcRenderer.invoke("storage:setSetting", key, value),
  deleteSetting: (key) => ipcRenderer.invoke("storage:deleteSetting", key),
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

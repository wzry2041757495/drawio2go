# Electron 端存储实现（SQLite）

## 模块概述

`electron/storage/` 是 DrawIO2Go 桌面应用的**本地数据持久化实现层**。通过 SQLite 数据库（better-sqlite3 驱动）为应用提供高性能的数据存储和查询能力。

核心职责：

1. **数据库生命周期管理**：初始化、关闭连接（通过 migrations 目录幂等迁移到 v1 Schema）
2. **CRUD 操作**：Settings、Projects、XMLVersions、Conversations、Messages 的完整增删改查
3. **事务处理**：批量操作的原子性保证（如批量删除对话、批量创建消息）
4. **跨项目隔离**：防止跨项目的非法访问（安全检查）
5. **序列号管理**：聊天消息的顺序保证（conversation_sequences 表）

与 `app/lib/storage/sqlite-storage.ts` 的关系：

- **sqlite-storage.ts**：TypeScript 适配器，实现 StorageAdapter 接口，与抽象层通信
- **sqlite-manager.js**：实现具体的 SQLite 操作，由 sqlite-storage.ts 调用

## 文件结构

```
electron/storage/
├── sqlite-manager.js          # 核心 SQLite 管理类（主文件，负责调用迁移 + CRUD）
└── migrations/                # SQLite 迁移脚本（PRAGMA user_version 驱动）
    ├── index.js               # runSQLiteMigrations 调度入口
    └── v1.js                  # V1 Schema 迁移（建表 + 索引 + 外键）
```

## SQLite 实现细节

### sqlite-manager.js

**类：SQLiteManager**

数据库存储在 `app.getPath('userData')/drawio2go.db`（Electron 用户数据目录）

#### 数据库配置

```javascript
new Database(dbPath, { verbose: console.log });
db.pragma("foreign_keys = ON"); // 启用外键约束
```

#### 核心方法分类

**初始化和生命周期**

- `initialize()`：创建/打开数据库 → 启用 WAL/外键 → 调用 `runSQLiteMigrations`（基于 `PRAGMA user_version`）→ 创建默认工程和 WIP 版本
- `close()`：关闭连接，清理缓存语句

**Settings（应用设置）**

- `getSetting(key)`, `setSetting(key, value)`, `deleteSetting(key)`, `getAllSettings()`
- 使用 UPSERT 逻辑（ON CONFLICT）处理插入或更新

##### API Key 安全存储（safeStorage，2025-12）

- **作用范围**：仅对 `settings.llm.providers`（兼容 `llm.providers`）中的 `ProviderConfig[].apiKey` 字段做加密存储/解密读取
- **存储格式**：`enc:v1:<base64>`（base64 是 `safeStorage.encryptString()` 的 Buffer 编码）
- **向后兼容**：未加密值仍按明文原样存储；读取时遇到非 `enc:v1:` 前缀会直接返回原始值
- **降级策略**：`safeStorage.isEncryptionAvailable()` 不可用时回退为明文存储并打印警告；已加密值在无法解密或数据损坏时返回空字符串并打印警告

**Projects（工程管理）**

- `getProject(uuid)`, `createProject(project)`, `updateProject(uuid, updates)`, `deleteProject(uuid)`, `getAllProjects()`
- 支持字段级别的更新（根据实际传入的 updates 对象动态生成 SQL）

**XMLVersions（版本管理）**

- `getXMLVersion(id, projectUuid?)`：支持可选的项目隔离检查
- `createXMLVersion(version)`：支持 BLOB（preview_image、preview_svg、pages_svg）和 JSON 元数据
- `getXMLVersionsByProject(projectUuid)`：批量查询（不返回 SVG 数据以减少传输）
- `getXMLVersionSVGData(id, projectUuid?)`：专用方法获取 SVG 数据
- `updateXMLVersion(id, updates)`：精细化字段更新处理
- `deleteXMLVersion(id, projectUuid?)`：删除前验证项目所有权
- **安全检查**：防止跨项目访问，违规时抛出错误并记录日志

**Conversations（对话管理）**

- `getConversation(id)`, `createConversation(conversation)`, `updateConversation(id, updates)`, `deleteConversation(id)`
- `batchDeleteConversations(ids)`：使用事务删除对话及关联消息
- `exportConversations(ids)`：导出对话数据为 JSON 格式（版本 1.1）
- `getConversationsByProject(projectUuid)`：查询项目下的所有对话

**Messages（消息管理）**

- `getMessagesByConversation(conversationId)`：按 sequence_number 排序
- `createMessage(message)`：单条创建（自动分配 sequence_number）
- `createMessages(messages)`：批量创建（支持 sequence_number 和自动生成）
- `deleteMessage(id)`：删除单条消息

**序列号管理（内部方法）**

- `_getNextSequenceNumber(conversationId)`：获取下一个序列号
- `_ensureSequenceFloor(conversationId, sequenceNumber)`：确保序列号不会往下调整

#### 关键特性

**Prepared Statements**

- 缓存高频语句（incrementSequenceStmt, ensureSequenceFloorStmt）以提高性能

**事务处理**

- 批量删除和批量创建使用 `this.db.transaction()` 包装，保证原子性
- 出错时自动回滚并记录日志

**BLOB 处理**

- preview_image、preview_svg、pages_svg 在 IPC 中转换为 Buffer：
  - 来自渲染进程：`Buffer.from(version.preview_image)`
  - 返回到渲染进程：直接作为 BLOB 列返回

**初始化过程**

- 创建默认工程（DEFAULT_PROJECT_UUID）
- 创建默认 WIP（Work In Progress）版本，避免首次连接时没有可用版本

### 数据库表结构（v1）

**settings**

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)
```

**projects**

```sql
CREATE TABLE projects (
  uuid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active_xml_version_id TEXT,
  active_conversation_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

**xml_versions**

```sql
CREATE TABLE xml_versions (
  id TEXT PRIMARY KEY,
  project_uuid TEXT NOT NULL,
  semantic_version TEXT NOT NULL,
  name TEXT,
  description TEXT,
  source_version_id TEXT NOT NULL,
  is_keyframe INTEGER NOT NULL,
  diff_chain_depth INTEGER NOT NULL,
  xml_content TEXT NOT NULL,
  metadata TEXT,
  page_count INTEGER NOT NULL,
  page_names TEXT,
  preview_svg BLOB,
  pages_svg BLOB,
  preview_image BLOB,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_uuid) REFERENCES projects(uuid) ON DELETE CASCADE
)
-- 索引：project_uuid, created_at
```

**conversations**

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_uuid TEXT NOT NULL,
  title TEXT NOT NULL,
  is_streaming INTEGER NOT NULL DEFAULT 0,
  streaming_since INTEGER DEFAULT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_uuid) REFERENCES projects(uuid) ON DELETE CASCADE
)
-- 索引：project_uuid, updated_at, created_at
```

**messages**

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  parts_structure TEXT NOT NULL,
  model_name TEXT,
  xml_version_id TEXT,
  sequence_number INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (xml_version_id) REFERENCES xml_versions(id) ON DELETE SET NULL
)
-- 索引：conversation_id, xml_version_id, (conversation_id, sequence_number)
```

**conversation_sequences**

```sql
CREATE TABLE conversation_sequences (
  conversation_id TEXT PRIMARY KEY,
  last_sequence INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
)
```

## IPC 通信机制

Electron 主进程和渲染进程通过 IPC 交互：

### 预加载脚本暴露的 API（electron/preload.js）

渲染进程通过 `window.electronStorage` 访问：

```javascript
electronStorage.initialize();
electronStorage.getSetting(key);
electronStorage.setSetting(key, value);
electronStorage.createProject(project);
// ... 等其他方法
```

### 主进程处理（electron/main.js）

使用 `ipcMain.handle()` 注册处理器，调用 SQLiteManager 方法：

```javascript
ipcMain.handle("storage:getSetting", async (event, key) => {
  return storageManager.getSetting(key);
});
```

### ArrayBuffer 转换

重要：二进制数据（BLOB）在 IPC 中的处理

- **创建版本时**：ArrayBuffer → Buffer
  ```javascript
  if (version.preview_image) {
    version.preview_image = Buffer.from(version.preview_image);
  }
  ```
- **返回数据时**：SQLite BLOB 直接返回给渲染进程

### API 完整清单

**Settings**：getSetting, setSetting, deleteSetting, getAllSettings
**Projects**：getProject, createProject, updateProject, deleteProject, getAllProjects
**XMLVersions**：getXMLVersion, createXMLVersion, getXMLVersionsByProject, getXMLVersionSVGData, updateXMLVersion, deleteXMLVersion
**Conversations**：getConversation, createConversation, updateConversation, deleteConversation, batchDeleteConversations, exportConversations, getConversationsByProject
**Messages**：getMessagesByConversation, createMessage, deleteMessage, createMessages

## 使用示例

### 初始化（app/lib/storage/sqlite-storage.ts）

```typescript
export async function initializeStorage(): Promise<void> {
  await window.electronStorage.initialize();
}
```

### 创建版本

```typescript
const version = await window.electronStorage.createXMLVersion({
  id: uuidv4(),
  project_uuid: projectId,
  semantic_version: "1.0.0",
  source_version_id: "zero",
  is_keyframe: true,
  xml_content: xmlString,
  preview_image: imageBuffer, // ArrayBuffer from canvas
  page_count: 1,
  page_names: JSON.stringify(["Page-1"]),
});
```

### 批量创建消息（事务保证）

```typescript
const messages = await window.electronStorage.createMessages([
  {
    id: msg1Id,
    conversation_id: convId,
    role: "user",
    content: "...",
    sequence_number: 1,
  },
  {
    id: msg2Id,
    conversation_id: convId,
    role: "assistant",
    content: "...",
    sequence_number: 2,
  },
]);
```

### 导出对话

```typescript
const jsonString = await window.electronStorage.exportConversations([
  convId1,
  convId2,
]);
const data = JSON.parse(jsonString); // { version, exportedAt, conversations }
```

## 限制和注意事项

1. **数据库路径**：固定在 Electron userData 目录，无法自定义
2. **外键约束**：启用外键约束，删除工程会级联删除版本和对话
3. **跨项目隔离**：XMLVersion 和 SvgData 查询强制验证项目所有权，违规抛异常
4. **序列号间隙**：如果消息被删除，sequence_number 不会重新编号（间隙保留）
5. **SVG 数据分离**：大量数据时，getXMLVersionsByProject 不返回 SVG，需调用 getXMLVersionSVGData 单独查询
6. **Web 环境不可用**：此实现仅在 Electron 中运行，Web 版本使用 IndexedDB

## 依赖

- **better-sqlite3**：同步 SQLite 驱动，性能优于异步驱动
- **uuid**：生成 ID
- **electron**：IPC、userData 路径
- **app/lib/storage/constants-shared.js**：共享常量（DEFAULT_PROJECT_UUID 等）
- **app/lib/storage/default-diagram-xml.js**：默认 XML 内容

## 代码腐化清理记录

### 2025-12-08 清理

**执行的操作**：

- 提取 SQL 占位符生成工具，消除多处字符串拼接与 off-by-one 风险。
- `exportConversations` 查询复用统一语句构造，减少冗余并保持字段顺序一致。
- 文档记录本次抽象，提醒新查询优先复用占位符与通用构造函数。

**影响文件**：1 个（sqlite-manager.js）

**下次关注**：

- 评估占位符工具在批量插入/删除场景的性能，必要时增加缓存。

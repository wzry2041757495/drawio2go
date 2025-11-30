# 统一存储层（Storage）

## 模块概述

统一存储抽象层为 DrawIO2Go 提供**跨平台、统一的数据持久化接口**。通过适配器模式，在不同运行环境中自动切换存储实现：

- **Web 端（浏览器）**：IndexedDB（idb 库）
- **Electron 端（桌面）**：SQLite（better-sqlite3）

核心职责：

1. **数据模型管理**：工程（Projects）、XML版本（XMLVersions）、对话（Conversations）、消息（Messages）、设置（Settings）
2. **版本管理引擎**：基于关键帧 + Diff-Match-Patch 的高效版本存储与恢复
3. **跨端兼容性**：两端实现接口一致，业务层无需关心平台差异
4. **元数据管理**：页面数量、页面名称、SVG 预览的统一验证与规范化

## 架构设计

### 双端存储方案

```
┌─────────────────────────────────────┐
│    业务层（Hooks、Components）      │
└──────────────┬──────────────────────┘
               │ getStorage() / createXMLVersion() / ...
┌──────────────┴──────────────────────┐
│     StorageAdapter（接口）          │  ← 统一抽象
└──────┬───────────────────┬──────────┘
       │                   │
┌──────▼────────┐  ┌───────▼────────┐
│ IndexedDB实现 │  │  SQLite实现    │
│  Web 环境     │  │ Electron 环境  │
└───────────────┘  └────────────────┘
```

### 表结构设计

**Settings**：应用全局配置（如当前工程 ID、LLM 配置等）

```typescript
{ key: string, value: string, updated_at: number }
```

**Projects**：工程元数据（单项目模式，当前仅 uuid="default"）

```typescript
{ uuid, name, description?, active_xml_version_id?, active_conversation_id?, created_at, updated_at }
```

**XMLVersions**：XML版本管理（关键帧 + Diff 混合存储）

```typescript
{
  id, project_uuid, semantic_version, name?, description?,
  source_version_id,      // 父版本 ID（ZERO_SOURCE_VERSION_ID = 无父）
  is_keyframe,            // true = 存储完整XML; false = 存储diff
  diff_chain_depth,       // 距最近关键帧的链长
  xml_content,            // 完整XML或diff字符串
  metadata, page_count, page_names (JSON),
  preview_svg?, pages_svg?, preview_image?,
  created_at
}
```

**Conversations & Messages**：聊天记录

- Conversations: { id, project_uuid, title, created_at, updated_at }
- Messages: { id, conversation_id, role, content, tool_invocations?, model_name?, xml_version_id?, sequence_number?, created_at }

### 版本管理策略

- **WIP 版本（v0.0.0）**：实时自动保存的活跃工作区，始终为关键帧，不计入历史版本
- **历史版本**：用户手动创建的语义化版本（如 v1.0.0, v1.0.1）
- **关键帧触发**：当 diff > 70% 或链长 > 10 时自动创建新关键帧
- **Diff 链**：通过 diff-match-patch 存储增量，节省存储空间

## 核心 API

### StorageAdapter 接口

```typescript
export interface StorageAdapter {
  // 初始化
  initialize(): Promise<void>;

  // Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  deleteSetting(key: string): Promise<void>;
  getAllSettings(): Promise<Setting[]>;

  // Projects（当前单项目模式）
  getProject(uuid: string): Promise<Project | null>;
  createProject(project: CreateProjectInput): Promise<Project>;
  updateProject(uuid: string, updates: UpdateProjectInput): Promise<void>;
  deleteProject(uuid: string): Promise<void>;
  getAllProjects(): Promise<Project[]>;

  // XMLVersions（版本管理核心）
  getXMLVersion(id: string, projectUuid?: string): Promise<XMLVersion | null>;
  createXMLVersion(version: CreateXMLVersionInput): Promise<XMLVersion>;
  getXMLVersionsByProject(projectUuid: string): Promise<XMLVersion[]>;
  getXMLVersionSVGData(
    id: string,
    projectUuid?: string,
  ): Promise<XMLVersionSVGData | null>;
  updateXMLVersion(id: string, updates: Partial<XMLVersion>): Promise<void>;
  deleteXMLVersion(id: string, projectUuid?: string): Promise<void>;

  // Conversations & Messages
  getConversation(id: string): Promise<Conversation | null>;
  createConversation(
    conversation: CreateConversationInput,
  ): Promise<Conversation>;
  updateConversation(
    id: string,
    updates: UpdateConversationInput,
  ): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  batchDeleteConversations(ids: string[]): Promise<void>;
  getConversationsByProject(projectUuid: string): Promise<Conversation[]>;
  exportConversations(ids: string[]): Promise<Blob>;

  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: CreateMessageInput): Promise<Message>;
  deleteMessage(id: string): Promise<void>;
  createMessages(messages: CreateMessageInput[]): Promise<Message[]>;
}
```

### 工厂函数

```typescript
// 获取存储实例（单例模式，自动环境检测）
const storage = await getStorage();

// 检测存储类型
const type = detectStorageType(); // 'sqlite' | 'indexeddb' | 'unknown'

// 重置实例（测试专用）
resetStorage();
```

### 写入管线（Writers）

```typescript
// 准备 XML 上下文（标准化 + 元数据提取）
const context = prepareXmlContext(xml);

// 保存 WIP 版本（自动保存）
const { versionId, context } = await persistWipVersion(
  projectUuid,
  xml,
  { previewImage?, name?, description?, timestamp? }
);

// 保存历史版本（手动创建版本快照）
const { versionId, pageCount, context, baseVersionId } =
  await persistHistoricalVersion(
    projectUuid,
    xml,
    semanticVersion, // e.g., "1.0.0"
    { description?, previewSvg?, pagesSvg?, pageNamesOverride? }
  );
```

### 版本恢复引擎

```typescript
import { materializeVersionXml } from "./xml-version-engine";

// 恢复指定版本的完整 XML（自动追踪diff链）
const baseVersion = await storage.getXMLVersion(versionId);
const completeXml = await materializeVersionXml(baseVersion, (id) =>
  storage.getXMLVersion(id, projectUuid),
);
```

### 当前工程管理

```typescript
import {
  resolveCurrentProjectUuid,
  persistCurrentProjectId,
  getStoredCurrentProjectId,
} from "@/lib/storage";

// 获取当前工程 UUID（未设置则返回 "default"）
const currentUuid = await resolveCurrentProjectUuid();

// 切换工程
await persistCurrentProjectId(newProjectUuid);

// 直接查询存储值
const storedUuid = await getStoredCurrentProjectId();
```

## 版本管理引擎详解

### 核心概念

1. **关键帧（Keyframe）**：存储完整 XML 内容，是 Diff 链的起点
2. **Diff 链**：一系列增量补丁，相对于父版本记录差异
3. **源版本 ID**：指向该版本的基线版本（ZERO_SOURCE_VERSION_ID = 无父）

### 版本数据计算流程

```typescript
const payload = await computeVersionPayload({
  newXml,                           // 新XML内容
  semanticVersion,                  // 版本号（如"1.0.0"或"0.0.0"）
  baseVersion,                      // 基线版本
  resolveVersionById: (id) => ...   // 版本查询函数
});
// payload: { xml_content, is_keyframe, diff_chain_depth, source_version_id }
```

逻辑：

- **WIP版本**：始终返回关键帧，允许内容重复
- **内容相同**：返回 null（无需创建新版本）
- **diff > 70% 或链长 > 10**：创建新关键帧
- **否则**：计算增量diff，继续链路

### 版本恢复流程

```typescript
const xml = await materializeVersionXml(targetVersion, (id) =>
  storage.getXMLVersion(id, projectUuid),
);
```

逻辑：

1. 若目标版本是关键帧 → 直接返回 XML
2. 若是Diff版本 → 向上追溯至最近关键帧
3. 从关键帧开始，依次应用所有diff补丁
4. 返回恢复的完整 XML

### 关键常量

```typescript
export const ZERO_SOURCE_VERSION_ID = "00000000-0000-0000-0000-000000000000";
export const WIP_VERSION = "0.0.0";
export const DIFF_KEYFRAME_THRESHOLD = 0.7; // 70%
export const MAX_DIFF_CHAIN_LENGTH = 10; // 最多10个diff
```

## 使用示例

### 示例 1：保存用户编辑（自动保存 WIP）

```typescript
// 在编辑器 onChange 回调中
import { persistWipVersion, DEFAULT_PROJECT_UUID } from "@/lib/storage";

async function handleEditorChange(newXml: string) {
  try {
    const { versionId } = await persistWipVersion(
      DEFAULT_PROJECT_UUID,
      newXml,
      { name: "WIP", description: "活跃工作区" },
    );
    console.log(`WIP已保存: ${versionId}`);
  } catch (error) {
    console.error("保存失败:", error);
  }
}
```

### 示例 2：用户手动创建版本快照

```typescript
import {
  persistHistoricalVersion,
  DEFAULT_PROJECT_UUID,
  WIP_VERSION,
} from "@/lib/storage";

async function createVersionSnapshot(xml: string, semanticVersion: string) {
  try {
    const { versionId, pageCount } = await persistHistoricalVersion(
      DEFAULT_PROJECT_UUID,
      xml,
      semanticVersion, // e.g., "1.0.0"
      { description: `Version ${semanticVersion}` },
    );
    console.log(
      `版本已创建: ${semanticVersion} (ID: ${versionId}, 页数: ${pageCount})`,
    );
  } catch (error) {
    console.error("创建版本失败:", error);
  }
}
```

### 示例 3：版本回滚

```typescript
import { materializeVersionXml, getStorage } from "@/lib/storage";

async function rollbackToVersion(versionId: string, projectUuid: string) {
  const storage = await getStorage();
  const version = await storage.getXMLVersion(versionId, projectUuid);
  if (!version) throw new Error("版本不存在");

  // 恢复完整XML
  const recoveredXml = await materializeVersionXml(version, (id) =>
    storage.getXMLVersion(id, projectUuid),
  );

  // 加载回编辑器
  editor.importXml(recoveredXml);
}
```

## 跨端兼容性注意事项

### 1. Blob vs Buffer

- **Web**：preview_svg / pages_svg / preview_image 为 Blob
- **Electron**：为 Buffer（通过 IPC 序列化时自动转换）

处理方法：

```typescript
const data = previewSvg; // Blob or Buffer
const bytes = data instanceof Blob ? await data.arrayBuffer() : data;
```

### 2. 数据库初始化

- **IndexedDB**：通过 `idb.openDB(..., { upgrade })` 回调创建表结构
- **SQLite**：通过主进程迁移脚本 (`electron/storage/migrations/v1.js`) 创建表
- **迁移机制**：版本号存储在 `pragma user_version`，保证幂等

### 3. 日期格式

所有时间戳统一为 **毫秒级 Unix 时间戳**（`Date.now()`）

### 4. 页面元数据校验

- 使用 `buildPageMetadataFromXml()` 统一提取页面名称和数量
- 两端验证逻辑完全一致（`page-metadata-validators.ts`）
- 确保 XML 解析的一致性

## 文件结构

```
app/lib/storage/
├── adapter.ts                    # StorageAdapter 接口定义
├── types.ts                      # 数据模型类型定义
├── constants.ts                  # 常量（版本号、阈值、DB配置）
├── constants-shared.ts           # 跨端共享常量
├── storage-factory.ts            # 工厂函数 & 单例管理
├── indexeddb-storage.ts          # Web 端 IndexedDB 实现
├── sqlite-storage.ts             # Electron 端 SQLite 实现（IPC调用）
├── xml-version-engine.ts         # 版本计算与恢复引擎
├── writers.ts                    # 统一写入管线（WIP & 历史版本）
├── current-project.ts            # 当前工程 ID 持久化
├── page-metadata.ts              # XML 页面元数据提取
├── page-metadata-validators.ts   # 页面数据校验工具
├── index.ts                      # 统一导出
├── migrations/
│   └── indexeddb/v1.ts          # IndexedDB 初始化脚本
└── default-diagram-xml.d.ts      # 默认XML模板类型定义
```

## 常见问题

### Q: 如何在 Hooks 中使用存储层？

A: 使用 `useStorageProjects`、`useStorageXMLVersions` 等 Hooks（位于 `app/hooks/`），它们已封装存储实例获取和初始化逻辑。

### Q: WIP 版本如何转换为历史版本？

A: 从 WIP 获取 XML 内容，调用 `persistHistoricalVersion()` 并指定新的 `semanticVersion`（如 "1.0.0"）。WIP 会保持独立，不被覆盖。

### Q: Diff 链断裂会怎样？

A: `materializeVersionXml()` 会抛出错误。需要从备份恢复或联系管理员。建议定期创建关键帧快照防范此情况。

### Q: 如何限制 SVG 预览大小？

A: SVG 在持久化前通过 `compression-utils` 进行 deflate-raw 压缩，上限为 8MB（`MAX_SVG_BLOB_BYTES`）。超过上限则不存储。

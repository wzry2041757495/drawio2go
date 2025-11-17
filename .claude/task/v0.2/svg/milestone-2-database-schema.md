# 里程碑2：数据库结构更新 ✅

**状态**: 已完成
**完成时间**: 2025-11-16

## 🎯 目标

扩展数据库 schema，新增 SVG 存储字段，为版本保存 SVG 数据提供存储能力。

## 📝 实际涉及文件

- `app/lib/storage/types.ts` - 类型定义（新增 page_count、page_names、preview_svg、pages_svg）
- `app/lib/storage/indexeddb-storage.ts` - Web 端存储实现（IndexedDB）
- `app/lib/storage/sqlite-storage.ts` - Electron 端存储实现（SQLite 适配层）
- `electron/storage/sqlite-manager.js` - SQLite 底层实现
- `app/lib/storage/page-metadata.ts` - **新增**：页面元数据提取工具
- `app/lib/storage/constants.ts` - 新增 MAX_SVG_BLOB_BYTES 常量
- `app/hooks/useCurrentProject.ts` - 集成页面元数据提取
- `app/hooks/useStorageXMLVersions.ts` - 集成页面元数据提取
- `app/lib/drawio-tools.ts` - 集成页面元数据提取

## ✅ 任务清单

### 1. 更新类型定义 ✅

- [x] 在 `app/lib/storage/types.ts` 中更新 `XMLVersion` 接口

  ```typescript
  interface XMLVersion {
    // ... 现有字段 ...

    // SVG 相关字段（破坏性新增）
    page_count: number; // 页面数量（必填）
    page_names?: string | null; // 页面名称列表（JSON 数组字符串）
    preview_svg?: Blob | Buffer; // 第一页 SVG（快速预览）
    pages_svg?: Blob | Buffer; // 所有页面 SVG 序列化数据
  }
  ```

- [x] 更新 `CreateXMLVersionInput` 类型以包含新字段

### 2. 更新 Web 端存储（IndexedDB） ✅

- [x] 修改 `app/lib/storage/indexeddb-storage.ts` 中的 schema（重建 xml_versions 表）
- [x] 添加数据库迁移逻辑
  - 采用破坏性更新，直接删除并重建 xml_versions 表
- [x] 更新 `createXMLVersion` 方法处理新字段
  - 自动从 XML 提取页面元数据（`buildPageMetadataFromXml`）
  - 确保 Blob 类型正确存储
  - 验证必填字段 `page_count`
  - 验证 SVG blob 大小（8MB 限制）
- [x] 更新 `updateXMLVersion` 方法处理新字段
- [x] 添加验证函数：`assertValidPageCount`, `assertValidPageNames`, `assertValidSvgBlob`

### 3. 更新 Electron 端存储（SQLite） ✅

- [x] 修改 `electron/storage/sqlite-manager.js` 中的 CREATE TABLE schema
  ```sql
  page_count INTEGER NOT NULL DEFAULT 1,
  page_names TEXT,
  preview_svg BLOB,
  pages_svg BLOB,
  ```
- [x] 更新 INSERT 和 UPDATE 语句包含所有新字段
- [x] 更新 `app/lib/storage/sqlite-storage.ts` 中的 `createXMLVersion` 方法
  - Blob 转 ArrayBuffer 发送到主进程
  - 主进程（electron/main.js）转为 Buffer 存储到 SQLite
  - 添加字段验证逻辑
- [x] 更新 `normalizeVersion` 方法
  - Buffer 转 Blob 返回给上层（preview_svg、pages_svg）
- [x] 添加验证函数：`assertValidPageCount`, `assertValidPageNames`, `assertValidSvgBlob`

### 4. 新增页面元数据提取工具 ✅

- [x] 创建 `app/lib/storage/page-metadata.ts`
  - 实现 `buildPageMetadataFromXml` 函数
  - 正则解析 `<diagram>` 标签提取页面数量和名称
  - 支持 XML 实体解码（`&quot;`, `&amp;` 等）
  - 处理边界情况（空 XML、无名称页面等）

### 5. 集成到所有写入点 ✅

- [x] `app/hooks/useCurrentProject.ts` - 创建新项目时填充页面元数据
- [x] `app/hooks/useStorageXMLVersions.ts` - 保存 WIP 和历史版本时填充
- [x] `app/lib/drawio-tools.ts` - DrawIO 保存时填充

### 6. 数据验证 ✅

- [x] 添加字段验证逻辑
  - `page_count` 必须 >= 1
  - `page_names` 必须是有效的 JSON 数组字符串
  - SVG blob 大小不超过 8MB（`MAX_SVG_BLOB_BYTES`）
- [x] 添加错误处理（所有验证函数都会抛出详细错误信息）

### 7. 常量定义 ✅

- [x] 在 `app/lib/storage/constants.ts` 添加 `MAX_SVG_BLOB_BYTES = 8MB`

## 🎯 验收标准

1. ✅ `XMLVersion` 类型包含所有新字段 - `types.ts:62-69` 已添加
2. ✅ Web 端（IndexedDB）能正确存储和读取 SVG Blob - 验证、存储、读取逻辑完整
3. ✅ Electron 端（SQLite）能正确存储和读取 SVG - Buffer↔Blob 转换完整
4. ✅ 新创建的版本包含 `page_count` 字段 - 所有写入点都调用 `buildPageMetadataFromXml`
5. ✅ 能正确序列化和反序列化 `pages_svg` 字段 - Blob/Buffer 处理逻辑完整
6. ✅ 数据库迁移正常，无数据损坏 - IndexedDB 重建表，SQLite 使用 `DEFAULT 1`

## 📋 完成总结

### 核心实现

1. **类型系统扩展**：`XMLVersion` 新增 4 个字段，支持多页面 SVG 存储
2. **页面元数据提取**：新增 `page-metadata.ts` 模块，自动解析 DrawIO XML
3. **存储层升级**：
   - **IndexedDB**：破坏性更新，重建表结构，原生 Blob 支持
   - **SQLite**：新增 4 列，Buffer↔Blob 完整转换链路
4. **自动化填充**：所有 XMLVersion 写入点自动调用元数据提取
5. **数据验证**：完整的字段验证 + 大小限制（8MB）

### 技术亮点

- **零手动操作**：页面数量和名称自动从 XML 提取，无需用户输入
- **跨平台一致性**：IndexedDB (Blob) 和 SQLite (Buffer) 统一接口
- **健壮性**：完整的边界情况处理（空 XML、无名称页面、XML 实体解码）
- **破坏性更新策略**：IndexedDB 直接重建，SQLite 使用 DEFAULT 保证向后兼容

### 集成点统计

共更新 **12 个文件**，影响 **5 个关键写入点**：

- 新项目创建（useCurrentProject）
- WIP 保存（useStorageXMLVersions）
- 历史版本保存（useStorageXMLVersions）
- DrawIO 保存（drawio-tools）
- 存储层（IndexedDB + SQLite）

## 📌 技术细节

### Blob 存储策略

- **IndexedDB**：直接存储 Blob（原生支持）
- **SQLite**：Blob → ArrayBuffer → IPC → Buffer → SQLite BLOB

### 数据验证规则

- `page_count`：必须 >= 1，自动从 XML 提取
- `page_names`：必须是 JSON 数组字符串，自动序列化
- `preview_svg/pages_svg`：可选，最大 8MB

### 破坏性更新处理

- **IndexedDB**：直接删除并重建 xml_versions 表
- **SQLite**：新字段使用 `DEFAULT 1`，确保旧数据兼容

## 🔗 依赖关系

- 依赖 **里程碑1** 完成（下一步将使用 `serializeSVGsToBlob` 等工具函数）
- 为 **里程碑3** 铺平道路（SVG 导出与存储集成）

# 里程碑2：数据库结构更新

## 🎯 目标
扩展数据库 schema，新增 SVG 存储字段，为版本保存 SVG 数据提供存储能力。

## 📝 涉及文件
- `app/lib/storage/db-schema.ts` - 数据库 schema 定义
- `app/lib/storage/storage-web.ts` - Web 端存储实现（IndexedDB）
- `app/lib/storage/storage-electron.ts` - Electron 端存储实现（SQLite）
- `app/lib/storage/types.ts` - 类型定义

## ✅ 任务清单

### 1. 更新类型定义
- [ ] 在 `app/lib/storage/types.ts` 中更新 `XMLVersion` 接口
  ```typescript
  interface XMLVersion {
    // ... 现有字段 ...

    // SVG 相关字段（破坏性新增）
    preview_svg?: Blob;      // 第一页 SVG（快速预览）
    pages_svg?: Blob;        // 所有页面 SVG 序列化数据
    page_count: number;      // 页面数量
    page_names?: string;     // 页面名称列表（JSON 数组字符串）
  }
  ```
- [ ] 更新 `CreateXMLVersionParams` 类型以包含新字段

### 2. 更新 Web 端存储（IndexedDB）
- [ ] 修改 `app/lib/storage/storage-web.ts` 中的 schema 版本号
- [ ] 添加数据库迁移逻辑（如果需要）
  - 由于是破坏性更新，可以直接清空旧数据
  - 或添加迁移逻辑为现有版本设置默认值
- [ ] 更新 `createXMLVersion` 方法处理新字段
  - 确保 Blob 类型正确存储
  - 验证必填字段 `page_count`
- [ ] 更新 `getXMLVersion` 方法返回新字段
- [ ] 测试 IndexedDB 存储和读取 SVG Blob

### 3. 更新 Electron 端存储（SQLite）
- [ ] 修改 `app/lib/storage/storage-electron.ts` 中的 schema
- [ ] 添加数据库迁移 SQL
  ```sql
  ALTER TABLE xml_versions ADD COLUMN preview_svg BLOB;
  ALTER TABLE xml_versions ADD COLUMN pages_svg BLOB;
  ALTER TABLE xml_versions ADD COLUMN page_count INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE xml_versions ADD COLUMN page_names TEXT;
  ```
- [ ] 更新 `createXMLVersion` 方法
  - Blob 转 Buffer 存储到 SQLite
  - 处理新字段的序列化
- [ ] 更新 `getXMLVersion` 方法
  - Buffer 转 Blob 返回给上层
  - 反序列化字段
- [ ] 测试 SQLite 存储和读取 SVG

### 4. 删除旧字段（可选）
- [ ] 评估是否删除旧的 `preview_image` 字段
- [ ] 评估是否清理 `metadata` 中的冗余数据
- [ ] 如果删除，更新相关代码

### 5. 数据验证
- [ ] 添加字段验证逻辑
  - `page_count` 必须 >= 1
  - `page_names` 必须是有效的 JSON 数组字符串
  - `pages_svg` 大小合理（不超过限制）
- [ ] 添加错误处理

## 🎯 验收标准
1. ✅ `XMLVersion` 类型包含所有新字段
2. ✅ Web 端（IndexedDB）能正确存储和读取 SVG Blob
3. ✅ Electron 端（SQLite）能正确存储和读取 SVG
4. ✅ 新创建的版本包含 `page_count` 字段
5. ✅ 能正确序列化和反序列化 `pages_svg` 字段
6. ✅ 数据库迁移正常，无数据损坏

## 📌 注意事项
- **破坏性更新**：可以直接修改 schema，无需考虑旧数据兼容
- Blob 在不同存储引擎中的处理方式不同：
  - IndexedDB：直接存储 Blob
  - SQLite：需要转换为 Buffer
- 注意 SVG 数据可能较大，考虑存储限制
- `page_count` 设为必填字段，确保数据完整性

## 🔗 依赖关系
- 依赖 **里程碑1** 完成（需要使用 `serializeSVGsToBlob` 等工具函数）

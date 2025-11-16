# SVG 导出功能 - 任务规划

## 📋 功能概述
为 drawio2go 项目添加版本保存时自动导出所有页面 SVG 的功能，支持版本预览、多页面查看和版本对比可视化。

## 🎯 核心需求
- ✅ **预先生成所有页面的 SVG**：保存版本时立即导出所有页面
- ✅ **默认启用**：无需额外配置，所有版本自动导出 SVG
- ✅ **多场景使用**：
  - 版本列表缩略图
  - 版本详情预览
  - 版本对比可视化

## 🏆 里程碑规划

### [里程碑1：核心SVG导出功能](./milestone-1-core-svg-export.md)
**目标**：实现 DrawioEditorNative 组件的 SVG 导出功能

**关键任务**：
- 扩展 DrawioEditorNative 组件，添加 `exportSVG()` 方法
- 创建 `svg-export-utils.ts` 工具库
- 实现多页面 SVG 导出逻辑

**预估时间**：2 小时
**依赖**：无

---

### [里程碑2：数据库结构更新](./milestone-2-database-schema.md)
**目标**：扩展数据库 schema，新增 SVG 存储字段

**关键任务**：
- 更新 `XMLVersion` 类型定义
- 修改 Web 端存储（IndexedDB）
- 修改 Electron 端存储（SQLite）
- 新增字段：`preview_svg`, `pages_svg`, `page_count`, `page_names`

**预估时间**：1.5 小时
**依赖**：里程碑1

---

### [里程碑3：版本创建集成](./milestone-3-version-creation.md)
**目标**：在版本创建流程中集成 SVG 导出功能

**关键任务**：
- 修改 `useStorageXMLVersions.ts` 的 `createHistoricalVersion` 函数
- 更新 `CreateVersionDialog.tsx` 传递编辑器引用
- 添加导出进度提示

**预估时间**：1.5 小时
**依赖**：里程碑1, 里程碑2

---

### [里程碑4：版本展示功能](./milestone-4-version-display.md)
**目标**：在版本卡片中展示 SVG 预览图和页面数量

**关键任务**：
- 增强 `VersionCard.tsx` 显示 SVG 缩略图
- 显示页面数量标识
- 添加"查看所有页面"按钮

**预估时间**：2 小时
**依赖**：里程碑2, 里程碑3

---

### [里程碑5：多页面SVG查看器](./milestone-5-multi-page-viewer.md)
**目标**：创建独立的多页面 SVG 查看器组件

**关键任务**：
- 创建 `PageSVGViewer.tsx` 组件
- 实现页面切换功能（标签页/箭头/键盘）
- 添加 SVG 缩放和导出功能

**预估时间**：3 小时
**依赖**：里程碑4

---

### [里程碑6：版本对比可视化](./milestone-6-version-compare.md)
**目标**：实现基于 SVG 的版本对比功能

**关键任务**：
- 创建 `VersionCompare.tsx` 组件
- 实现并排 SVG 显示
- 支持同步缩放和页面切换
- 集成到版本列表

**预估时间**：3 小时
**依赖**：里程碑5

---

## 📊 总体时间预估
- **总计**：约 13 小时
- **核心功能**（里程碑1-3）：5 小时
- **展示功能**（里程碑4-6）：8 小时

## 🔄 实施顺序
1. **第一阶段**（MVP）：里程碑1 → 里程碑2 → 里程碑3
   - 完成后即可实现"保存版本时导出所有页面 SVG"的核心需求
2. **第二阶段**（展示）：里程碑4 → 里程碑5
   - 完成后用户可以查看历史版本的 SVG 预览
3. **第三阶段**（对比）：里程碑6
   - 增强功能，支持版本对比可视化

## 📝 开发注意事项

### 技术要点
- **破坏性更新**：直接修改数据库结构，无需考虑旧数据兼容
- **DrawIO API 限制**：不支持程序化切换页面，需通过重新加载单页 XML 实现
- **内存管理**：及时清理 ObjectURL，避免内存泄漏
- **性能优化**：多页面导出耗时较长，需添加进度提示

### 数据存储
- `preview_svg`：第一页 SVG（Blob）
- `pages_svg`：所有页面 SVG 序列化数据（Blob）
- `page_count`：页面数量（number）
- `page_names`：页面名称列表（JSON 字符串）

### 用户体验
- 多页面导出时显示进度（"正在导出第 2/5 页..."）
- 版本卡片显示缩略图和页面数量
- 支持键盘快捷键操作
- 移动端响应式适配

## ✅ 验收标准（整体）
1. ✅ 保存版本时自动导出所有页面的 SVG
2. ✅ 版本卡片显示第一页缩略图和页面数量
3. ✅ 可打开多页面查看器浏览所有页面
4. ✅ 支持版本对比，并排显示两个版本的 SVG
5. ✅ 导出过程有清晰的进度提示
6. ✅ 性能良好（3页图表导出 < 10秒）
7. ✅ UI 美观，操作流畅
8. ✅ 移动端显示正常

## 🚀 快速开始
1. 阅读各里程碑的详细文档
2. 按顺序实施（建议先完成里程碑1-3）
3. 每个里程碑完成后进行测试
4. 根据实际情况调整计划

## 📚 相关文档
- [DrawIO Embed API 文档](https://www.drawio.com/doc/faq/embed-mode)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [SQLite Blob 存储](https://www.sqlite.org/datatype3.html)

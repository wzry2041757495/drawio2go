# 里程碑3：版本创建集成

## 🎯 目标
在版本创建流程中集成 SVG 导出功能，实现保存版本时自动导出所有页面的 SVG 并存储。

## 📝 涉及文件
- `app/hooks/useStorageXMLVersions.ts` - 版本管理 Hook
- `app/components/version/CreateVersionDialog.tsx` - 创建版本对话框
- 调用 `CreateVersionDialog` 的父组件（需要传递 `editorRef`）

## ✅ 任务清单

### 1. 修改 useStorageXMLVersions Hook
- [ ] 在 `createHistoricalVersion` 函数中添加 `editorRef` 参数
  ```typescript
  const createHistoricalVersion = async (
    projectUuid: string,
    semanticVersion: string,
    description?: string,
    editorRef?: React.RefObject<DrawioEditorRef>  // 新增
  ): Promise<string>
  ```
- [ ] 实现 SVG 导出逻辑
  - [ ] 检查 `editorRef` 是否可用
  - [ ] 导出完整 XML：`await editorRef.current.exportDiagram()`
  - [ ] 导出所有页面 SVG：`await exportAllPagesSVG(editorRef.current, fullXml)`
  - [ ] 准备存储数据：
    ```typescript
    const previewSvg = new Blob([allPagesSVG[0].svg], { type: 'image/svg+xml' });
    const pagesSvg = serializeSVGsToBlob(allPagesSVG);
    const pageCount = allPagesSVG.length;
    const pageNames = JSON.stringify(allPagesSVG.map(p => p.name));
    ```
- [ ] 更新 `storage.createXMLVersion` 调用，传入新字段
  ```typescript
  await storage.createXMLVersion({
    // ... 现有字段 ...
    preview_svg: previewSvg,
    pages_svg: pagesSvg,
    page_count: pageCount,
    page_names: pageNames,
  });
  ```
- [ ] 添加错误处理
  - SVG 导出失败时的降级处理
  - 记录错误日志
- [ ] 添加导出进度回调（可选）

### 2. 更新 CreateVersionDialog 组件
- [ ] 添加 `editorRef` 属性
  ```typescript
  interface CreateVersionDialogProps {
    projectUuid: string;
    isOpen: boolean;
    onClose: () => void;
    onVersionCreated?: () => void;
    editorRef: React.RefObject<DrawioEditorRef>;  // 新增，必需
  }
  ```
- [ ] 在 `handleCreate` 中传递 `editorRef`
  ```typescript
  await createHistoricalVersion(
    projectUuid,
    versionNumber.trim(),
    description.trim() || undefined,
    editorRef  // 传递编辑器引用
  );
  ```
- [ ] 添加导出进度状态
  ```typescript
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  ```
- [ ] 在 UI 中显示导出进度
  ```typescript
  {exportProgress.total > 0 && (
    <div className="text-sm text-gray-500">
      正在导出第 {exportProgress.current}/{exportProgress.total} 页...
    </div>
  )}
  ```
- [ ] 禁用提交按钮直到导出完成

### 3. 更新 CreateVersionDialog 的调用点
- [ ] 找到所有使用 `CreateVersionDialog` 的父组件
- [ ] 确保传递 `editorRef` 属性
- [ ] 验证 `editorRef.current` 在调用时已初始化

### 4. 优化用户体验
- [ ] 添加加载状态指示器
- [ ] 多页面时显示"正在处理..."提示
- [ ] 导出失败时显示友好的错误信息
- [ ] 成功后显示成功提示（包含页面数量）

### 5. 测试
- [ ] 测试单页图表版本创建
- [ ] 测试多页图表版本创建（2页、3页、5页）
- [ ] 测试导出失败的降级处理
- [ ] 测试编辑器未初始化时的错误处理
- [ ] 验证存储的 SVG 数据完整性

## 🎯 验收标准
1. ✅ 创建版本时自动导出所有页面的 SVG
2. ✅ SVG 数据正确存储到数据库
3. ✅ `page_count` 和 `page_names` 字段正确填充
4. ✅ 多页面导出有清晰的进度提示
5. ✅ 导出过程中 UI 有加载状态指示
6. ✅ 导出失败时有友好的错误提示
7. ✅ 单页和多页图表都能正常工作

## 📌 注意事项
- 多页面导出可能耗时较长（每页约 0.5-1 秒），需要添加进度提示
- 确保在导出过程中用户无法关闭对话框或重复提交
- 导出失败时考虑是否允许继续保存版本（无 SVG）
- 测试时注意大型图表（如 10+ 页）的性能表现

## 🔗 依赖关系
- 依赖 **里程碑1** 完成（使用 `exportAllPagesSVG` 工具函数）
- 依赖 **里程碑2** 完成（数据库 schema 已更新）

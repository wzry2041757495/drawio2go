# 里程碑4：版本展示功能

## 🎯 目标
在版本卡片和列表中展示 SVG 预览图，提供页面数量标识，实现基础的版本可视化展示。

## 📝 涉及文件
- `app/components/version/VersionCard.tsx` - 版本卡片组件
- `app/components/version/VersionList.tsx` - 版本列表组件（如存在）
- 相关样式文件

## ✅ 任务清单

### 1. 增强 VersionCard 组件
- [ ] 读取并显示 `preview_svg`
  ```typescript
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (version.preview_svg) {
      const url = URL.createObjectURL(version.preview_svg);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);  // 清理
    }
  }, [version.preview_svg]);
  ```
- [ ] 添加 SVG 预览图显示区域
  ```typescript
  {previewUrl && (
    <div className="version-preview">
      <img src={previewUrl} alt="版本预览" />
    </div>
  )}
  ```
- [ ] 显示页面数量标识
  ```typescript
  {version.page_count > 1 && (
    <Badge variant="secondary">
      共 {version.page_count} 页
    </Badge>
  )}
  ```
- [ ] 添加页面名称列表（可选，hover 时显示）
  ```typescript
  const pageNames = version.page_names
    ? JSON.parse(version.page_names)
    : [];

  <Tooltip content={pageNames.join(', ')}>
    <Badge>共 {version.page_count} 页</Badge>
  </Tooltip>
  ```
- [ ] 优化 SVG 显示样式
  - 设置合适的缩略图尺寸
  - 添加边框或阴影
  - 响应式布局

### 2. 添加"查看所有页面"功能
- [ ] 添加展开/收起状态
  ```typescript
  const [showAllPages, setShowAllPages] = useState(false);
  ```
- [ ] 添加"查看所有页面"按钮（仅多页面时显示）
  ```typescript
  {version.page_count > 1 && (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setShowAllPages(true)}
    >
      查看所有 {version.page_count} 页
    </Button>
  )}
  ```
- [ ] 点击按钮时打开多页面查看器（为里程碑5做准备）

### 3. 优化无 SVG 时的降级显示
- [ ] 检测 `preview_svg` 是否存在
- [ ] 无 SVG 时显示占位符
  ```typescript
  {!previewUrl && (
    <div className="version-preview-placeholder">
      <IconFile />
      <span>无预览图</span>
    </div>
  )}
  ```
- [ ] 显示提示信息（如"旧版本无预览图"）

### 4. 性能优化
- [ ] 使用虚拟滚动（如果版本列表很长）
- [ ] 懒加载 SVG（仅可见时加载）
- [ ] 缓存 ObjectURL，避免重复创建
- [ ] 组件卸载时清理 ObjectURL

### 5. 样式调整
- [ ] 设计 SVG 预览区域样式
  - 缩略图尺寸：建议 200x150px 或 16:9 比例
  - 背景色：浅灰色或白色
  - 边框：1px solid 灰色
- [ ] 设计页面数量徽章样式
- [ ] 响应式布局，移动端适配
- [ ] 添加 hover 效果

### 6. 测试
- [ ] 测试单页版本显示
- [ ] 测试多页版本显示（2页、5页、10页）
- [ ] 测试无 SVG 的旧版本显示
- [ ] 测试 SVG 加载失败时的错误处理
- [ ] 测试长列表的性能表现
- [ ] 测试不同尺寸的 SVG 显示效果

## 🎯 验收标准
1. ✅ 版本卡片显示第一页的 SVG 缩略图
2. ✅ 多页版本显示页面数量标识
3. ✅ 无 SVG 的版本有合理的占位符
4. ✅ SVG 显示美观，尺寸合适
5. ✅ 页面数量标识清晰可见
6. ✅ 性能良好，无内存泄漏
7. ✅ 移动端显示正常

## 📌 注意事项
- **内存管理**：及时 `revokeObjectURL` 避免内存泄漏
- **性能**：大量版本时考虑懒加载和虚拟滚动
- **兼容性**：确保 SVG 在不同浏览器中正常显示
- **安全性**：如果 SVG 来自用户输入，注意 XSS 风险（DrawIO 生成的应该安全）
- **响应式**：SVG 缩略图在小屏幕上也要清晰可见

## 🔗 依赖关系
- 依赖 **里程碑2** 完成（数据库包含 SVG 字段）
- 依赖 **里程碑3** 完成（版本已保存 SVG 数据）
- 为 **里程碑5** 做准备（多页面查看器）

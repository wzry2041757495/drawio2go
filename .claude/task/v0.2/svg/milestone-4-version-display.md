# 里程碑4：版本展示功能

## 🎯 目标

在版本卡片和列表中展示 SVG 预览图，提供页面数量标识，实现基础的版本可视化展示。

## 📝 涉及文件

- `app/components/version/VersionCard.tsx` - 版本卡片组件
- `app/components/version/VersionList.tsx` - 版本列表组件（如存在）
- 相关样式文件

## ✅ 任务清单

### 1. 增强 VersionCard 组件

- [x] 读取并显示 `preview_svg`
  - 实现了 `createBlobFromSource` 处理多种二进制源格式
  - 使用 `useEffect` 管理 ObjectURL 的创建与清理

- [x] 添加 SVG 预览图显示区域
  - 实现了 `version-preview` 容器，16:10 比例
  - `<img>` 标签展示预览，`object-fit: contain` 避免拉伸

- [x] 显示页面数量标识
  - 实现了 `version-page-badge`，显示"共 X 页" + `LayoutGrid` 图标
  - 仅在 `page_count > 0` 时显示

- [x] 添加页面名称列表（可选，hover 时显示）
  - 实现了 `parsePageNames` 解析 JSON
  - 使用 `TooltipRoot` + `TooltipContent` 悬停显示页面名称列表

- [x] 优化 SVG 显示样式
  - 16:10 固定比例，`min-height: 160px`
  - 边框 `var(--border-light)`，内阴影效果
  - 响应式布局，移动端自适应

### 2. 添加"查看所有页面"功能

- [x] 添加展开/收起状态
  - 实现了 `const [showAllPages, setShowAllPages] = useState(false)`
  - 折叠卡片时自动重置为 `false`

- [x] 添加"查看所有页面"按钮（仅多页面时显示）
  - 使用 `hasMultiplePages` 判断 `page_count > 1`
  - 按钮显示"查看所有 X 页" / "收起页面"，动态切换

- [x] 点击按钮时打开多页面查看器（为里程碑5做准备）
  - 实现了完整的 `version-pages-grid` 栅格布局
  - 懒加载 `pages_svg`，解析为 `PageThumbnail[]` 并渲染
  - 支持加载中、错误、空状态的 UI 展示

### 3. 优化无 SVG 时的降级显示

- [x] 检测 `preview_svg` 是否存在
  - `createBlobFromSource` 检测各种二进制格式，返回 `null` 表示缺失
  - `!previewUrl` 作为降级条件

- [x] 无 SVG 时显示占位符
  - 实现了 `version-preview--placeholder` 样式
  - 使用 `ImageOff` 图标（Lucide）

- [x] 显示提示信息（如"旧版本无预览图"）
  - 占位符显示"暂无 SVG 预览" + "旧版本可能未导出 SVG，保存新的快照即可生成缩略图"
  - 使用 `var(--text-tertiary)` 弱化提示文字

### 4. 性能优化

- [ ] 使用虚拟滚动（如果版本列表很长）
  - 未实现（可选，在版本数量极大时才需要，当前栅格布局性能可接受）

- [x] 懒加载 SVG（仅可见时加载）
  - `preview_svg` 在组件挂载时加载（卡片默认折叠，展开才可见）
  - `pages_svg` 仅在 `showAllPages === true` 时懒加载

- [x] 缓存 ObjectURL，避免重复创建
  - 使用 `pageObjectUrlsRef` 保存所有页面 URL
  - 依赖 `version.id` 确保版本切换时重新创建

- [x] 组件卸载时清理 ObjectURL
  - 实现了 `cleanupPageUrls` 函数，清理所有 ObjectURL
  - `useEffect` 返回清理函数，确保组件卸载时执行
  - 卡片折叠时也自动清理多页面 URL

### 5. 样式调整

- [x] 设计 SVG 预览区域样式
  - 缩略图尺寸：16:10 比例，`min-height: 160px`
  - 背景色：`var(--background, #ffffff)`
  - 边框：`1px solid var(--border-light)`
  - 内阴影：`inset 0 0 0 1px rgba(51, 136, 187, 0.04)`

- [x] 设计页面数量徽章样式
  - 实现了 `version-page-badge`
  - 边框 `var(--border-primary)`，背景 `var(--bg-secondary)`
  - 使用 `LayoutGrid` 图标，字号 `var(--font-size-compact-xs)`

- [x] 响应式布局，移动端适配
  - 栅格布局 `repeat(auto-fit, minmax(120px, 1fr))`
  - 预览容器自适应宽度，`aspect-ratio: 16 / 10`

- [x] 添加 hover 效果
  - CSS 中包含过渡和悬停样式
  - 按钮使用 HeroUI 默认 hover 效果

### 6. 测试（需用户手动验证）

- [ ] 测试单页版本显示
  - 检查 `preview_svg` 是否正确渲染
  - 确认不显示"查看所有页面"按钮

- [ ] 测试多页版本显示（2页、5页、10页）
  - 检查页面徽章是否显示正确数量
  - 验证页面名称 Tooltip 是否正确
  - 测试"查看所有页面"按钮展开/收起功能

- [ ] 测试无 SVG 的旧版本显示
  - 验证占位符是否正确显示
  - 检查提示文字是否清晰

- [ ] 测试 SVG 加载失败时的错误处理
  - 验证 `version-pages-grid__status--error` 样式
  - 检查错误信息是否友好

- [ ] 测试长列表的性能表现
  - 验证 ObjectURL 是否正确清理（检查浏览器内存）
  - 测试大量版本的滚动性能

- [ ] 测试不同尺寸的 SVG 显示效果
  - 验证 `object-fit: contain` 是否正常工作
  - 测试超宽、超高 SVG 的显示效果

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

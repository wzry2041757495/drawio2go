# 里程碑6：版本对比可视化

## 🎯 目标
实现基于 SVG 的版本对比功能，支持并排显示两个版本的图表，逐页对比差异。

## 📝 涉及文件
- `app/components/version/VersionCompare.tsx` - 新建版本对比组件
- `app/components/version/VersionList.tsx` - 添加对比入口
- `app/hooks/useVersionCompare.ts` - 新建对比逻辑 Hook（可选）
- 相关样式文件

## ✅ 任务清单

### 1. 创建 VersionCompare 组件
- [ ] 创建 `app/components/version/VersionCompare.tsx`
- [ ] 定义组件接口
  ```typescript
  interface VersionCompareProps {
    versionA: XMLVersion;  // 旧版本
    versionB: XMLVersion;  // 新版本
    isOpen: boolean;
    onClose: () => void;
  }
  ```
- [ ] 实现基础布局
  - 使用 Dialog/Modal 或全屏模式
  - 左右分栏布局（或上下布局）
  - 显示版本信息（版本号、时间、描述）

### 2. 加载两个版本的 SVG 数据
- [ ] 分别加载两个版本的 `pages_svg`
  ```typescript
  const [pagesA, setPagesA] = useState<PageSVG[] | null>(null);
  const [pagesB, setPagesB] = useState<PageSVG[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        deserializeSVGsFromBlob(versionA.pages_svg),
        deserializeSVGsFromBlob(versionB.pages_svg),
      ]).then(([a, b]) => {
        setPagesA(a);
        setPagesB(b);
      });
    }
  }, [versionA, versionB, isOpen]);
  ```
- [ ] 处理页面数量不一致的情况
  - 显示警告提示（如"版本A有3页，版本B有5页"）
  - 对齐页面索引（按名称或索引）
- [ ] 添加加载状态

### 3. 实现并排 SVG 显示
- [ ] 创建左右分栏布局
  ```typescript
  <div className="compare-container">
    <div className="compare-left">
      <h3>版本 {versionA.semantic_version}</h3>
      {pagesA && (
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(pagesA[currentPage].svg)}`} />
      )}
    </div>
    <div className="compare-divider" />
    <div className="compare-right">
      <h3>版本 {versionB.semantic_version}</h3>
      {pagesB && (
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(pagesB[currentPage].svg)}`} />
      )}
    </div>
  </div>
  ```
- [ ] 支持同步缩放（两侧同时缩放）
- [ ] 支持同步滚动（可选，拖拽一侧时另一侧同步）

### 4. 实现页面同步切换
- [ ] 添加页面切换器（类似里程碑5）
- [ ] 切换页面时同时更新两侧显示
- [ ] 显示当前对比的页面名称
- [ ] 处理页面数量不一致的情况
  - 超出范围的页面显示"无此页面"
  - 或仅显示共同的页面

### 5. 添加差异高亮（可选，进阶功能）
- [ ] 分析两个 SVG 的差异
  - 可以使用像素级对比（Canvas）
  - 或 SVG DOM 结构对比
- [ ] 在 UI 中标注差异区域
  - 使用红色/绿色标记变化
  - 显示差异统计（如"10处修改"）
- [ ] 添加"下一个差异"/"上一个差异"导航

### 6. 添加对比工具栏
- [ ] 缩放控制（同步缩放）
  - 放大
  - 缩小
  - 适应窗口
  - 原始大小
- [ ] 布局切换
  - 左右布局
  - 上下布局
  - 叠加模式（可选）
- [ ] 导出对比报告（可选）
  - 导出为 PDF
  - 导出为图片

### 7. 集成到版本列表
- [ ] 在 `VersionList.tsx` 中添加"选择版本对比"模式
  ```typescript
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<XMLVersion[]>([]);
  ```
- [ ] 添加"对比"按钮
- [ ] 选择两个版本后打开对比组件
  ```typescript
  {selectedVersions.length === 2 && (
    <VersionCompare
      versionA={selectedVersions[0]}
      versionB={selectedVersions[1]}
      isOpen={compareOpen}
      onClose={() => setCompareOpen(false)}
    />
  )}
  ```
- [ ] 添加快速对比按钮（如"与上一版本对比"）

### 8. 优化用户体验
- [ ] 添加版本信息对比
  - 版本号
  - 创建时间
  - 描述
  - 页面数量
- [ ] 添加快捷键支持
  - 左右箭头切换页面
  - ESC 关闭对比
  - 数字键快速跳转页面
- [ ] 添加加载动画
- [ ] 优化性能（懒加载、虚拟化）

### 9. 样式设计
- [ ] 设计对比界面布局
  - 响应式设计
  - 移动端适配（可能需要切换为上下布局）
- [ ] 添加版本标识色（如旧版本用蓝色边框，新版本用绿色）
- [ ] 优化分隔线样式
- [ ] 添加过渡动画

### 10. 测试
- [ ] 测试相同页面数的版本对比
- [ ] 测试不同页面数的版本对比
- [ ] 测试单页版本对比
- [ ] 测试多页版本对比（5页、10页）
- [ ] 测试同步缩放功能
- [ ] 测试页面切换
- [ ] 测试布局切换
- [ ] 测试性能（大尺寸 SVG）
- [ ] 测试移动端显示

## 🎯 验收标准
1. ✅ 能打开版本对比界面
2. ✅ 能并排显示两个版本的 SVG
3. ✅ 能同步切换页面
4. ✅ 支持同步缩放
5. ✅ 页面数量不一致时有合理提示
6. ✅ 版本信息清晰展示
7. ✅ UI 美观，操作流畅
8. ✅ 移动端显示正常

## 📌 注意事项
- **性能**：同时加载两组 SVG 数据，注意内存占用
- **页面对齐**：页面数量不同时的处理逻辑要清晰
- **差异高亮**：这是进阶功能，可以放到后续迭代
- **布局选择**：根据屏幕尺寸自动选择左右或上下布局
- **同步滚动**：如果 SVG 很大需要滚动，考虑同步滚动位置

## 🔗 依赖关系
- 依赖 **里程碑2** 完成（数据库包含 SVG 数据）
- 依赖 **里程碑3** 完成（版本已保存 SVG）
- 依赖 **里程碑5** 完成（可复用 SVG 显示逻辑）
- 建议在 **里程碑5** 之后实现，可以复用很多组件和逻辑

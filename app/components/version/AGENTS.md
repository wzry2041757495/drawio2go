# 版本管理组件系统

## 概述

完整的版本管理 UI 组件体系，支持版本创建、展示、对比、预览和时间线管理。基于 DrawIO XML 版本存储系统，提供关键帧/Diff 混合存储、智能差异对比、多页面支持和虚拟滚动优化。

## 核心组件列表

| 组件名                  | 文件                    | 功能           | 主要特性                                                |
| ----------------------- | ----------------------- | -------------- | ------------------------------------------------------- |
| **VersionCard**         | VersionCard.tsx         | 版本卡片       | 折叠展开、预览、页面缩略图、快速对比、回滚导出          |
| **VersionTimeline**     | VersionTimeline.tsx     | 版本时间线     | 历史版本列表、虚拟滚动、对比模式、子版本视图            |
| **VersionCompare**      | VersionCompare.tsx      | 版本对比       | 多种布局（分割/堆叠/覆盖/智能）、缩放平移、智能差异高亮 |
| **PageSVGViewer**       | PageSVGViewer.tsx       | 页面查看器     | 全屏多页浏览、缩放平移、导航、全屏模式                  |
| **CreateVersionDialog** | CreateVersionDialog.tsx | 版本创建对话框 | 版本号输入、主版本/子版本切换、版本存在检查             |

## 核心功能说明

### 版本展示（VersionCard）

**文件**: `VersionCard.tsx`

单个版本的紧凑卡片展示，支持折叠/展开两种视图模式。

**折叠状态**（默认）：

- 版本号和徽章（最新、关键帧、Diff 链深度、页数、子版本数）
- 版本描述（自适应宽度）
- 创建时间（紧凑格式）
- 展开箭头

**展开状态**：

- 版本名称和完整描述
- SVG 预览图（可点击全屏查看）
- 页面缩略图网格（多页时可展开）
- 完整创建时间和元数据
- 快速对比、导出、回滚、子版本导航等操作按钮

**特殊处理**：

- **WIP 版本**: 保持折叠状态，显示"当前画布内容"
- **多页版本**: 提供缩略图展开和全屏查看器
- **子版本**: 标记为子版本，支持回溯到父版本
- **比较模式**: 添加选择复选框和顺序指示器

### 版本时间线（VersionTimeline）

**文件**: `VersionTimeline.tsx`

历史版本的时间线列表，支持虚拟滚动优化大量版本的性能。

**核心特性**：

- **虚拟滚动**: 版本数 > 30 时自动启用，估计高度 70px，overscan 5 项
- **时间线头部**: 显示视图模式（主版本/子版本）、版本统计、快速对比按钮
- **WIP 置顶**: WIP 版本（v0.0.0）始终显示在列表首位
- **双视图模式**:
  - `main`: 显示所有主版本和 WIP
  - `sub`: 显示特定主版本的所有子版本
- **对比模式**: 支持选择多个版本进行对比
- **空状态**: 无版本时显示友好提示

**排序规则**：按创建时间倒序（最新优先），WIP 总是最上方

### 版本对比（VersionCompare）

**文件**: `VersionCompare.tsx`

两个版本之间的智能对比和差异可视化，支持多种布局和互动操作。

**对比布局模式**：

| 模式        | 特点                       | 适用场景           |
| ----------- | -------------------------- | ------------------ |
| **split**   | 左右分割显示               | 宽屏设备，详细对比 |
| **stack**   | 上下堆叠显示               | 竖屏/小屏设备      |
| **overlay** | 半透明覆盖，支持透明度调整 | 快速查看细微变化   |
| **smart**   | 智能差异高亮（红绿黄）     | 快速定位变更元素   |

**交互功能**：

- **缩放**: 0.3x ~ 4x，步长 0.2x（+/-、重置、拖拽缩放）
- **平移**: 鼠标按住拖拽或滚轮移动
- **页面导航**: 多页对比时的页面选择
- **版本切换**: 下拉菜单快速切换对比版本
- **响应式**: <960px 宽度自动切换为 stack 模式

**智能差异（Smart Diff）**：

- 基于 data-cell-id 精确匹配
- 几何语义匹配（位置、大小、文本）
- 元素级差异分类（匹配、变更、仅 A、仅 B）
- 视觉高亮：红（删除）、绿（新增）、黄（变更）

### 页面查看器（PageSVGViewer）

**文件**: `PageSVGViewer.tsx`

全屏多页 SVG 查看器，支持灵活的缩放和平移交互。

**功能**：

- **多页导航**: 页面选择下拉列表、上下键或箭头按钮导航
- **缩放控制**: 0.1x ~ 10x 调整，自适应缩放到页面宽度/高度
- **平移操作**: 鼠标拖拽或滚轮平移
- **全屏模式**: 响应式全屏显示
- **页面信息**: 显示当前页码和总页数
- **导出**: 单页或全部页面 SVG 下载

**加载策略**：

- 懒加载页面 SVG 数据（仅在打开查看器时加载）
- 支持压缩 Blob 解析
- 错误恢复和加载状态提示

### 版本创建对话框（CreateVersionDialog）

**文件**: `CreateVersionDialog.tsx`

版本快照创建表单，支持主版本/子版本两种类型。

**功能**：

- **版本类型选择**: 主版本 vs 子版本
- **版本号输入**:
  - 主版本: 自由输入，格式验证（如 1.2.3）
  - 子版本: 选择父版本 + 输入子版本号（如 1.2 → 1.2.1）
- **智能推荐**: 基于历史版本自动推荐下一个版本号
- **版本存在检查**: 实时检查版本号是否已存在
- **版本描述**: 可选的版本说明文字
- **导出进度**: 显示版本快照导出的进度条

## 与存储层的集成

### 数据流

```
CreateVersionDialog
  → createHistoricalVersion()
  → useStorageXMLVersions Hook
  → Storage Adapter (SQLite/IndexedDB)
  → XMLVersions 表
```

### 使用的存储接口

- `getAllXMLVersions()`: 获取所有版本（用于主版本列表）
- `getXMLVersion()`: 获取特定版本详情
- `saveXMLVersion()`: 保存新版本
- `loadVersionSVGFields()`: 懒加载 SVG 预览和页面数据

### 版本特性

- **语义化版本**: 支持 `major.minor.patch` 和子版本 `major.minor.patch.subX` 格式
- **关键帧管理**: 自动创建关键帧（Diff 占比 >70% 或链长 >10）
- **Diff 链**:
  - `is_keyframe=true`: 存储完整 XML
  - `is_keyframe=false`: 存储与父版本的 diff-match-patch 差异
  - `diff_chain_depth`: 距离最近关键帧的链长
- **WIP 版本**: 特殊的 v0.0.0 版本，实时自动保存当前画布，不计入历史

## 使用示例

### 基础集成

```typescript
import {
  VersionTimeline,
  VersionCard,
  CreateVersionDialog,
  VersionCompare,
  PageSVGViewer,
} from "@/app/components/version";

function VersionPanel({ projectUuid, versions }) {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const editorRef = useRef(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [compareVersions, setCompareVersions] = useState(null);

  return (
    <>
      <button onClick={() => setCreateDialogOpen(true)}>保存版本</button>

      <CreateVersionDialog
        projectUuid={projectUuid}
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        editorRef={editorRef}
        onVersionCreated={() => {
          // 版本创建成功后的处理
        }}
      />

      <VersionTimeline
        projectUuid={projectUuid}
        versions={versions}
        compareMode={compareMode}
        selectedIds={selectedIds}
        onToggleSelect={(id) => {
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          );
        }}
        onQuickCompare={(pair) => setCompareVersions(pair)}
      />

      {compareVersions && (
        <VersionCompare
          versionA={compareVersions.versionA}
          versionB={compareVersions.versionB}
          versions={versions}
          isOpen={true}
          onClose={() => setCompareVersions(null)}
        />
      )}
    </>
  );
}
```

### 版本卡片自定义

```typescript
<VersionCard
  version={version}
  isLatest={true}
  defaultExpanded={false}
  compareMode={true}
  selected={true}
  compareOrder={0}
  onRestore={(versionId) => {
    // 回滚到此版本
  }}
  onToggleSelect={(versionId) => {
    // 选择/取消选择此版本用于对比
  }}
  onQuickCompare={() => {
    // 快速对比此版本
  }}
  allVersions={versions}
  onNavigateToSubVersions={(parentVersion) => {
    // 导航到子版本视图
  }}
/>
```

### 时间线配置

```typescript
<VersionTimeline
  projectUuid="project-uuid"
  versions={versions}
  isLoading={loading}
  compareMode={false}
  viewMode={{ type: "main" }}
  onViewModeChange={(mode) => {
    if (mode.type === "sub") {
      console.log("Viewing sub-versions of:", mode.parentVersion);
    }
  }}
/>
```

## 性能优化

### 虚拟滚动

- **启用阈值**: 版本数 > 30
- **估计高度**: 70px（VersionCard 折叠状态）
- **Overscan**: 5 项（预加载前后项目）
- **框架**: @tanstack/react-virtual

### 懒加载 SVG

- **preview_svg**: 首次展开卡片时加载
- **pages_svg**: 用户点击"展开缩略图"时加载
- **解压处理**: 自动处理 deflate-raw 压缩的 Blob

### 共享逻辑

- **缩放/平移复用**: PageSVGViewer 与 VersionCompare 均使用 `usePanZoomStage` 统一处理缩放、拖拽和滚轮逻辑（可配置 Ctrl-only / always）。
- **页面解析复用**: 版本多页数据加载统一通过 `useVersionPages`（解压 pages_svg + 合并 page_names + 兜底名称）。

### 内存管理

- **页面 URL 清理**: 使用 useRef 和 cleanup 机制防止泄漏
- **Canvas/DOM 缓存**: PageSVGViewer 使用 stageRef 复用 DOM
- **事件监听**: 组件卸载时自动移除所有事件监听器

## 文件结构

```
app/components/version/
├── VersionCard.tsx           # 版本卡片组件
├── VersionTimeline.tsx       # 版本时间线组件
├── VersionCompare.tsx        # 版本对比组件
├── PageSVGViewer.tsx         # 页面查看器组件
├── CreateVersionDialog.tsx   # 版本创建对话框
├── index.ts                  # 统一导出
└── __tests__/               # 单元测试
```

## 相关类型定义

**XMLVersion**: 版本存储模型（app/lib/storage/types.ts）

```typescript
interface XMLVersion {
  id: string; // UUID 主键
  project_uuid: string; // 关联项目
  semantic_version: string; // 版本号（如 "1.2.3" 或 "0.0.0" WIP）
  source_version_id: string; // 父版本 ID
  is_keyframe: boolean; // 是否关键帧
  diff_chain_depth: number; // Diff 链深度
  xml_content: string; // 完整 XML 或 diff 字符串
  name?: string; // 版本名称
  description?: string; // 版本描述
  page_count: number; // 页面数量
  page_names?: string; // JSON 格式的页面名称数组
  preview_svg?: Blob; // 首页 SVG 预览（压缩）
  pages_svg?: Blob; // 所有页面 SVG 序列化数据（压缩）
  created_at: number; // 创建时间戳
}
```

**SmartDiffResult**: 智能对比结果

```typescript
interface SmartDiffResult {
  svg: string | null; // 差异高亮 SVG
  stats: SmartDiffStats; // 匹配统计
  warnings: string[]; // 警告信息
}

interface SmartDiffStats {
  matched: number; // 匹配的元素数
  changed: number; // 变更的元素数
  onlyA: number; // 仅第一个版本有的元素数
  onlyB: number; // 仅第二个版本有的元素数
  coverage: number; // 匹配覆盖率（0-1）
}
```

## 国际化

- 使用 `useAppTranslation("version")` Hook
- 支持多语言版本时间戳格式（`formatVersionTimestamp`）
- 所有 UI 文本自动本地化

## 限制和注意事项

1. **SVG 预览大小**: preview_svg 仅存储第一页，用于快速预览
2. **多页数据压缩**: pages_svg 使用 deflate-raw 压缩，自动解压处理
3. **虚拟滚动粒度**: 由于动态高度，虚拟滚动估计可能有偏差（大约 ±20%）
4. **智能差异限制**: 受限于 DrawIO 导出的坐标精度，匹配率通常 60~90%
5. **查看器内存**: 多页查看器加载时会占用内存，关闭后自动清理

## 代码腐化清理记录

### 2025-12-08 清理

**执行的操作**：

- `PageSVGViewer` 与 `VersionCompare` 迁移到新 hooks（`usePanZoomStage`、`useVersionPages`），缩放/分页逻辑下沉复用。
- 删除 `components/version/version-utils.ts`，版本格式化改用 `app/lib/version-utils.ts`。
- 事件处理统一 `onPress`，对齐 `@react-aria/interactions` 的交互语义。
- SVG/Blob 解析改用 `blob-utils.ts`，简化多页数据解压与兜底。

**影响文件**：3 个（PageSVGViewer、VersionCompare、version-utils 删除）

**下次关注**：

- 评估新 hooks 在多页大图场景下的性能与内存占用。
- 若增加更多对比布局，考虑将对比状态管理提取独立 hook。

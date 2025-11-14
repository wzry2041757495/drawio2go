# Milestone 2: Button 组件迁移

## 📋 里程碑概述

**优先级**：⭐⭐⭐ 高
**预计时间**：3-4 小时
**状态**：🔲 待开始
**依赖**：Milestone 1 (主题配置)
**阻塞**：无

## 🎯 目标

将项目中所有按钮统一迁移到 HeroUI Button 组件，删除所有自定义按钮样式类（如 `.button-primary`、`.button-secondary`），使用 HeroUI 原生的 `variant` 和 `color` props 控制样式。

## 📊 影响范围

根据代码分析，Button 组件在以下 **12+ 个文件**中使用：

### 高频使用文件

1. `app/components/TopBar.tsx` - 顶栏按钮
2. `app/components/ChatSidebar.tsx` - 聊天操作按钮
3. `app/components/SettingsSidebar.tsx` - 设置按钮
4. `app/components/VersionSidebar.tsx` - 版本管理按钮
5. `app/components/ProjectSelector.tsx` - 项目选择按钮
6. `app/components/chat/ChatInputActions.tsx` - 聊天输入区按钮
7. `app/components/settings/ConnectionTester.tsx` - 连接测试按钮
8. `app/components/version/WIPIndicator.tsx` - WIP 操作按钮
9. `app/components/version/VersionCard.tsx` - 版本卡片按钮
10. `app/components/version/CreateVersionDialog.tsx` - 对话框按钮

## ✅ 任务清单

### 1. 定义 Button 迁移映射规则

| 旧样式类                   | HeroUI 替代方案                                      | 说明         |
| -------------------------- | ---------------------------------------------------- | ------------ |
| `.button-primary`          | `<Button variant="solid" color="primary">`           | 主要操作按钮 |
| `.button-secondary`        | `<Button variant="bordered" color="primary">`        | 次要操作按钮 |
| `.chat-icon-button`        | `<Button variant="light" isIconOnly>`                | 图标按钮     |
| `.chat-send-button`        | `<Button variant="solid" color="primary" size="sm">` | 发送按钮     |
| `.floating-actions button` | `<Button variant="flat" size="sm">`                  | 浮动操作按钮 |

### 2. TopBar.tsx 按钮迁移

- [ ] **"选择项目" 按钮**

  ```tsx
  // 旧代码
  <Button className="button-primary" onClick={...}>
    <FolderOpen /> 选择项目
  </Button>

  // 新代码
  <Button variant="solid" color="primary" onPress={...}>
    <FolderOpen /> 选择项目
  </Button>
  ```

- [ ] **"加载/保存" 按钮**
  - 使用 `variant="bordered"` 作为次要操作

- [ ] **侧栏控制按钮（图标按钮）**
  ```tsx
  <Button variant="light" isIconOnly onPress={...}>
    <PanelRightClose />
  </Button>
  ```

### 3. ChatInputActions.tsx 按钮迁移

- [ ] **发送按钮**

  ```tsx
  <Button
    variant="solid"
    color="primary"
    size="sm"
    isDisabled={isDisabled}
    onPress={handleSubmit}
  >
    发送
  </Button>
  ```

- [ ] **停止生成按钮**

  ```tsx
  <Button variant="bordered" color="danger" size="sm" onPress={stop}>
    停止
  </Button>
  ```

- [ ] **其他图标按钮**（如清空、重置等）
  - 使用 `variant="light" isIconOnly`

### 4. ProjectSelector.tsx 按钮迁移

- [ ] **"选择项目" 按钮**

  ```tsx
  <Button variant="solid" color="primary" onPress={handleSelect}>
    <Check /> 选择项目
  </Button>
  ```

- [ ] **"新建项目" 按钮**

  ```tsx
  <Button variant="bordered" color="primary" onPress={handleCreate}>
    <Plus /> 新建项目
  </Button>
  ```

- [ ] **"浏览..." 按钮**
  ```tsx
  <Button variant="flat" size="sm" onPress={handleBrowse}>
    浏览...
  </Button>
  ```

### 5. VersionSidebar.tsx 按钮迁移

- [ ] **"保存快照" 按钮**

  ```tsx
  <Button variant="solid" color="primary" onPress={saveSnapshot}>
    <Save /> 保存快照
  </Button>
  ```

- [ ] **"创建版本" 按钮**
  ```tsx
  <Button variant="bordered" color="primary" onPress={createVersion}>
    创建版本
  </Button>
  ```

### 6. VersionCard.tsx 按钮迁移

- [ ] **"加载" 按钮**

  ```tsx
  <Button variant="flat" size="sm" color="primary" onPress={loadVersion}>
    <Download /> 加载
  </Button>
  ```

- [ ] **"删除" 按钮**
  ```tsx
  <Button variant="flat" size="sm" color="danger" onPress={deleteVersion}>
    删除
  </Button>
  ```

### 7. WIPIndicator.tsx 按钮迁移

- [ ] **"初始化 WIP" 按钮**
  ```tsx
  <Button variant="bordered" color="primary" size="sm" onPress={initWIP}>
    初始化 WIP
  </Button>
  ```

### 8. SettingsSidebar.tsx 按钮迁移

- [ ] **"保存设置" 按钮**

  ```tsx
  <Button variant="solid" color="primary" onPress={saveSettings}>
    保存设置
  </Button>
  ```

- [ ] **"重置" 按钮**
  ```tsx
  <Button variant="bordered" color="default" onPress={resetSettings}>
    重置
  </Button>
  ```

### 9. ConnectionTester.tsx 按钮迁移

- [ ] **"测试连接" 按钮**
  ```tsx
  <Button
    variant="bordered"
    color="primary"
    isLoading={isTesting}
    onPress={testConnection}
  >
    测试连接
  </Button>
  ```

### 10. CreateVersionDialog.tsx 按钮迁移

- [ ] **"创建" 按钮**

  ```tsx
  <Button variant="solid" color="primary" onPress={onCreate}>
    创建
  </Button>
  ```

- [ ] **"取消" 按钮**
  ```tsx
  <Button variant="light" color="default" onPress={onCancel}>
    取消
  </Button>
  ```

### 11. 其他文件中的按钮

- [ ] **搜索并替换所有 `onClick` 为 `onPress`**
  - HeroUI v3 使用 `onPress` 事件（基于 React Aria）
  - 确保所有 Button 组件使用 `onPress` 而非 `onClick`

- [ ] **移除所有 `className="button-*"` 引用**

- [ ] **移除所有硬编码的按钮样式**
  - 如 `style={{ background: '#3388BB' }}`
  - 改用 HeroUI 的 color props

### 12. CSS 清理（按钮迁移完成后立即执行）

- [ ] **验证所有按钮已迁移**
  - 搜索 `className="button-primary"` 应无结果
  - 搜索 `className="button-secondary"` 应无结果
  - 搜索 `.chat-icon-button` 应无结果

- [ ] **删除 `app/styles/components/buttons.css`** (129 行)
  - 文件包含所有自定义按钮样式
  - 删除前再次确认无任何引用

- [ ] **从 `globals.css` 中移除 buttons.css 导入**

  ```css
  // 删除这行
  @import "./styles/components/buttons.css" layer(components);
  ```

- [ ] **测试验证**
  - 刷新页面，所有按钮样式正常
  - 无 console 错误
  - 按钮交互正常（hover、press、disabled 态）

## 📝 实现细节

### HeroUI Button API 参考

```tsx
import { Button } from '@heroui/react';

<Button
  variant="solid" | "bordered" | "light" | "flat" | "ghost"
  color="default" | "primary" | "success" | "warning" | "danger"
  size="sm" | "md" | "lg"
  radius="none" | "sm" | "md" | "lg" | "full"
  isIconOnly={boolean}
  isDisabled={boolean}
  isLoading={boolean}
  onPress={() => void}
>
  内容
</Button>
```

### variant 选择指南

- **solid**: 实心，用于主要操作（如"保存"、"创建"、"发送"）
- **bordered**: 边框，用于次要操作（如"取消"、"重置"）
- **light**: 轻量，用于图标按钮、不突出的操作
- **flat**: 扁平，用于卡片内的操作按钮
- **ghost**: 幽灵，用于不需要背景的按钮

### color 选择指南

- **primary**: 品牌色操作（#3388BB）
- **default**: 默认灰色操作
- **success**: 成功/确认操作
- **warning**: 警告操作
- **danger**: 危险/删除操作

### size 选择指南

- **sm**: 小型按钮（卡片内、紧凑布局）
- **md**: 标准按钮（默认）
- **lg**: 大型按钮（主要操作、首屏）

## 🧪 验证标准

### 功能验证

- [ ] **所有按钮点击正常**
  - onPress 事件正确触发
  - 无点击失效的按钮

- [ ] **按钮状态正确**
  - isDisabled 状态显示正确
  - isLoading 状态显示加载动画
  - hover 态显示正确

- [ ] **按钮视觉效果**
  - 主要操作按钮使用 primary 色
  - 次要操作按钮样式区分明显
  - 危险操作使用 danger 色
  - 图标按钮大小合适

- [ ] **响应式布局**
  - 小屏幕下按钮不溢出
  - 按钮组排列整齐

### 代码验证

- [ ] **无自定义按钮类引用**
  - 搜索 `.button-primary` 无结果
  - 搜索 `.button-secondary` 无结果
  - 搜索 `.chat-icon-button` 无结果

- [ ] **统一使用 onPress**
  - 搜索 `<Button.*onClick` 无结果（除非有特殊原因）

- [ ] **无硬编码样式**
  - 搜索 `style=.*#3388BB` 无结果
  - 搜索 `className=.*border-\[#3388BB\]` 无结果

- [ ] **buttons.css 已删除**
  - 文件不存在
  - globals.css 中无导入引用

### 可访问性验证

- [ ] **键盘导航**
  - Tab 键可以聚焦所有按钮
  - Enter/Space 键可以激活按钮

- [ ] **屏幕阅读器**
  - 图标按钮有适当的 aria-label
  - 按钮语义清晰

## 📚 参考资源

- [HeroUI Button Docs](https://v3.heroui.com/docs/components/button)
- [HeroUI Button Examples](https://v3.heroui.com/docs/components/button#examples)
- [React Aria Button Docs](https://react-spectrum.adobe.com/react-aria/Button.html)

## ⚠️ 注意事项

1. **onClick vs onPress**
   - HeroUI v3 基于 React Aria，使用 `onPress` 而非 `onClick`
   - `onPress` 支持键盘、触摸、鼠标等多种交互方式
   - 确保所有事件处理器迁移正确

2. **isIconOnly 按钮**
   - 必须设置 `isIconOnly={true}`
   - 必须包含 `aria-label` 属性用于无障碍

3. **异步操作按钮**
   - 使用 `isLoading` prop 而非自定义加载状态
   - HeroUI 会自动显示 Spinner

4. **按钮组布局**
   - 使用 Tailwind 的 `flex gap-2` 代替自定义布局
   - 或使用 HeroUI 的 ButtonGroup 组件（如果需要）

5. **不要过度使用 primary 色**
   - 每个视图区域只应有 1-2 个 primary 按钮
   - 其他按钮使用 bordered、light 等变体

## 🔗 相关里程碑

- **依赖**：
  - Milestone 1: 主题配置（需要 primary 色配置）

- **后续**：
  - Milestone 3: 表单组件（表单提交按钮也需迁移）
  - Milestone 5: CSS 清理（删除 buttons.css）

## 📝 完成标准

- [x] 所有任务清单项完成
- [x] 所有验证标准通过
- [x] 所有按钮交互正常
- [x] buttons.css 已删除
- [x] 无 console 错误或警告
- [x] 代码已提交到 Git

---

**创建日期**：2025-11-14
**预计开始**：Milestone 1 完成后
**实际开始**：-
**完成日期**：-

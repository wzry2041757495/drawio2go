# Toast 通知系统

## 概述

全局 Toast 通知组件系统，用于向用户展示临时性消息反馈（成功、信息、警告、错误）。基于 React Context 和 Portal 实现，支持队列管理、自动关闭、暂停/恢复和多种展示样式。

## 核心组件

### ToastProvider（提供器）

**文件**: `ToastProvider.tsx`

全局通知管理提供器，使用 Context API 和 Reducer 模式管理通知队列。

**主要特性**：

- **队列管理**: 最多同时显示 3 个通知，超出数量自动排队
- **自动关闭**: 默认 3.2 秒后自动消退（可自定义时长）
- **平滑退出动画**: 200ms 退出动画，确保用户体验
- **暂停/恢复**: 鼠标悬停或获得焦点时自动暂停倒计时
- **Portal 渲染**: 通过 React Portal 在 body 根部渲染，避免 z-index 冲突
- **内存管理**: 完整的 cleanup 机制，防止定时器泄漏

**核心概念**：

- `MAX_VISIBLE = 3`: 同时显示的最大通知数
- `DEFAULT_DURATION = 3200`: 默认显示时长（毫秒）
- `EXIT_DURATION = 200`: 退出动画时长（毫秒）

### Toast（通知组件）

**文件**: `Toast.tsx`

单个通知的展示组件，支持标题、描述、关闭按钮和不同的视觉变体。

**子组件**：

- `Toast.Root`: 主容器，管理交互事件
- `Toast.Icon`: 根据类型展示图标（成功/信息/警告/错误）
- `Toast.Content`: 标题和描述文本区域
- `Toast.Close`: 关闭按钮

**无障碍特性**：

- 按 Escape 键关闭通知
- 支持键盘导航和屏幕阅读器
- 根据类型自动设置正确的 ARIA role

## API 和使用方法

### useToast Hook

```typescript
const { push, dismiss, clear } = useToast();
```

**方法**:

#### push(toast)

推送一个新通知到队列。

```typescript
const id = push({
  variant: 'success',              // 必须: 'success' | 'info' | 'warning' | 'danger'
  title?: 'Title Text',            // 可选: 通知标题
  description: 'Message text',     // 必须: 通知内容
  duration?: 5000,                 // 可选: 显示时长（毫秒），默认 3200
  action?: {                       // 可选: 操作按钮（如“打开下载页”）
    label: 'Open',
    onPress: () => {},
  },
});
```

**返回值**: 通知 ID（string），可用于手动关闭

#### dismiss(id)

立即关闭指定通知。

```typescript
dismiss(id);
```

#### clear()

清空所有通知（包括队列中的）。

```typescript
clear();
```

## 配置选项

### Toast 类型（variant）

支持四种预定义的通知类型：

| 类型      | 图标          | 颜色 | 用途                 |
| --------- | ------------- | ---- | -------------------- |
| `success` | CheckCircle2  | 绿色 | 操作成功、上传完成等 |
| `info`    | Info          | 蓝色 | 普通信息、提示等     |
| `warning` | AlertTriangle | 黄色 | 警告、注意事项等     |
| `danger`  | XCircle       | 红色 | 错误、操作失败等     |

### 位置和堆叠

通知在页面**右下角**以垂直堆叠方式显示，最多 3 个同时可见。超出数量自动进入队列，当前面通知关闭时自动补位。

### 持续时间

- **默认**: 3.2 秒（DEFAULT_DURATION = 3200）
- **自定义**: 通过 `duration` 参数指定（毫秒）
- **禁用自动关闭**: 设置 `duration: Infinity`

## 使用示例

### 基础用法

```typescript
import { useToast } from '@/app/components/toast';

function MyComponent() {
  const { push } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      push({
        variant: 'success',
        title: '保存成功',
        description: '数据已保存到服务器',
      });
    } catch (error) {
      push({
        variant: 'danger',
        title: '保存失败',
        description: error.message,
      });
    }
  };

  return <button onClick={handleSave}>保存</button>;
}
```

### 自定义时长

```typescript
push({
  variant: "warning",
  title: "提示",
  description: "此操作无法撤销",
  duration: 5000, // 显示 5 秒
});
```

### 仅显示描述

```typescript
push({
  variant: "info",
  description: "页面已自动保存",
});
```

### 禁用自动关闭

```typescript
const id = push({
  variant: "danger",
  title: "网络连接异常",
  description: "请检查网络设置",
  duration: Infinity,
});

// 用户手动关闭或按条件关闭
setTimeout(() => dismiss(id), 10000);
```

## 集成到应用

在应用根组件中包装 ToastProvider：

```typescript
// app/layout.tsx
import { ToastProvider } from '@/app/components/toast';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
```

## 国际化支持

通知组件内置国际化支持，关闭按钮使用本地化文本：

```typescript
const closeLabel = t("toast.close", "Close notification");
```

支持切换语言时自动更新关闭按钮文本。

## 限制和注意事项

1. **必须在 ToastProvider 内使用**: useToast Hook 必须在 ToastProvider 包裹的子组件中使用，否则抛出错误
2. **最多 3 个同时显示**: 超出数量自动进入等待队列
3. **默认右下角位置**: 通过 CSS 自定义 `.toast-stack` 位置
4. **Portal 渲染**: 通知渲染在 document.body，确保 z-index 不被父组件层级影响
5. **内存开销**: 长时间持续推送大量通知可能占用内存，建议定期清空

## 文件结构

```
app/components/toast/
├── ToastProvider.tsx    # 提供器和 Hook
├── Toast.tsx            # 通知组件
├── index.ts             # 统一导出
└── __tests__/           # 单元测试
    ├── ToastProvider.test.tsx
    └── Toast.test.tsx
```

## 相关类型定义

类型定义位于 `@/app/types/toast.ts`：

```typescript
interface Toast {
  id: string;
  variant: "success" | "info" | "warning" | "danger";
  title?: string;
  description: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void | Promise<void>;
    ariaLabel?: string;
  };
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}
```

# useChatNetworkControl Hook 使用示例

## 概述

`useChatNetworkControl` Hook 从 ChatSidebar 提取了网络状态监听和处理逻辑，用于统一管理：

- 网络断开时的流式响应停止、锁释放、会话清理
- 网络恢复时的提示显示
- 与 ChatRunStateMachine 状态机的协调

## 在 ChatSidebar 中使用

### 1. 导入 Hook

```typescript
import {
  useChatLock,
  useNetworkStatus,
  useChatNetworkControl,
  // ... 其他 hooks
} from "@/app/hooks";
```

### 2. 初始化网络状态监听

```typescript
// 网络状态监听
const { isOnline, offlineReason } = useNetworkStatus();

// 计算离线原因标签
const offlineReasonLabel = useMemo(() => {
  if (!offlineReason) return undefined;
  switch (offlineReason) {
    case "browser-offline":
      return t("chat:status.networkOfflineShort");
    case "ping-fail":
      return t("chat:status.networkDisconnectedHint");
    default:
      return undefined;
  }
}, [offlineReason, t]);
```

### 3. 使用 useChatNetworkControl Hook

```typescript
// 网络控制（网络断开/恢复处理）
const { showOnlineRecoveryHint, dismissRecoveryHint } = useChatNetworkControl({
  isOnline,
  offlineReasonLabel,
  isChatStreaming,
  activeConversationId,
  stateMachine: stateMachine.current,
  releaseLock,
  stop,
  updateStreamingFlag,
  markConversationAsCompleted,
  resolveConversationId,
  openAlertDialog,
  t,
  toolQueue: toolQueue.current,
});
```

### 4. 在 UI 中显示网络恢复提示（可选）

如果你希望在界面上显示一个额外的网络恢复提示（除了 Alert 对话框），可以使用 `showOnlineRecoveryHint` 状态：

```tsx
{
  showOnlineRecoveryHint && (
    <Alert status="info" variant="secondary" className="mb-2">
      {t("chat:status.networkOnlineDesc")}
    </Alert>
  );
}
```

## 完整示例

```typescript
export function ChatSidebar({ isOpen, editorRef }: ChatSidebarProps) {
  const { t } = useI18n();
  const { openAlertDialog } = useAlertDialog();

  // 网络状态
  const { isOnline, offlineReason } = useNetworkStatus();
  const offlineReasonLabel = useMemo(() => {
    if (!offlineReason) return undefined;
    switch (offlineReason) {
      case "browser-offline":
        return t("chat:status.networkOfflineShort");
      case "ping-fail":
        return t("chat:status.networkDisconnectedHint");
      default:
        return undefined;
    }
  }, [offlineReason, t]);

  // 聊天锁
  const { canChat, releaseLock, acquireLock } = useChatLock(currentProjectId);

  // 状态机
  const stateMachine = useRef(new ChatRunStateMachine());

  // useChat
  const {
    messages,
    setMessages,
    input,
    setInput,
    stop,
    isLoading: isChatStreaming,
    // ... 其他 useChat 返回值
  } = useChat({
    // ... useChat 配置
  });

  // 网络控制
  const { showOnlineRecoveryHint } = useChatNetworkControl({
    isOnline,
    offlineReasonLabel,
    isChatStreaming,
    activeConversationId,
    stateMachine: stateMachine.current,
    releaseLock,
    stop,
    updateStreamingFlag,
    markConversationAsCompleted,
    resolveConversationId,
    openAlertDialog,
    t,
    toolQueue: toolQueue.current,
  });

  return (
    <div className="chat-sidebar">
      {showOnlineRecoveryHint && (
        <Alert status="info" variant="secondary" className="mb-2">
          {t("chat:status.networkOnlineDesc")}
        </Alert>
      )}
      {/* ... 其他 UI 组件 */}
    </div>
  );
}
```

## 替代的 ChatSidebar 逻辑

在使用 `useChatNetworkControl` 之前，ChatSidebar 中需要手动处理网络状态变化：

```typescript
// ❌ 旧的实现（在 ChatSidebar.tsx 中）
useEffect(() => {
  const previousOnline = previousOnlineStatusRef.current;
  const onlineStatusChanged = previousOnline !== isOnline;
  previousOnlineStatusRef.current = isOnline;

  if (!onlineStatusChanged) return;

  if (!isOnline) {
    setShowOnlineRecoveryHint(false);

    if (isChatStreaming) {
      logger.warn("[ChatSidebar] 网络断开，停止聊天请求");
    } else {
      logger.warn("[ChatSidebar] 网络断开，当前无流式请求，释放聊天锁");
    }

    const ctx = stateMachine.current.getContext();
    const targetConversationId = activeConversationId ?? ctx?.conversationId;

    stop();
    releaseLock();

    if (targetConversationId) {
      updateStreamingFlag(targetConversationId, false).catch(/* ... */);
      resolveConversationId(targetConversationId)
        .then((resolvedId) => markConversationAsCompleted(resolvedId))
        .catch(/* ... */);
    }

    openAlertDialog({
      status: "danger",
      title: t("chat:status.networkOffline"),
      description: /* ... */,
      isDismissable: true,
    });

    wasOfflineRef.current = true;
    return;
  }

  if (wasOfflineRef.current) {
    wasOfflineRef.current = false;
    setShowOnlineRecoveryHint(true);
    logger.info("[ChatSidebar] 网络恢复，允许继续聊天");

    openAlertDialog({
      status: "warning",
      title: t("chat:status.networkOnline"),
      description: t("chat:status.networkOnlineDesc"),
      isDismissable: true,
    });
  }
}, [/* 很多依赖 */]);
```

使用 `useChatNetworkControl` 后：

```typescript
// ✅ 新的实现（使用 hook）
const { showOnlineRecoveryHint } = useChatNetworkControl({
  isOnline,
  offlineReasonLabel,
  isChatStreaming,
  activeConversationId,
  stateMachine: stateMachine.current,
  releaseLock,
  stop,
  updateStreamingFlag,
  markConversationAsCompleted,
  resolveConversationId,
  openAlertDialog,
  t,
  toolQueue: toolQueue.current,
});
```

## API 参考

### 输入参数（UseChatNetworkControlOptions）

| 参数                          | 类型                                                | 说明                                  |
| ----------------------------- | --------------------------------------------------- | ------------------------------------- |
| `isOnline`                    | `boolean`                                           | 网络在线状态（来自 useNetworkStatus） |
| `offlineReasonLabel`          | `string \| undefined`                               | 离线原因标签（用于显示）              |
| `isChatStreaming`             | `boolean`                                           | 是否正在流式聊天                      |
| `activeConversationId`        | `string \| null`                                    | 当前活动的会话 ID                     |
| `stateMachine`                | `ChatRunStateMachine`                               | 聊天运行状态机                        |
| `releaseLock`                 | `() => void`                                        | 聊天锁释放函数                        |
| `stop`                        | `() => void`                                        | 停止流式响应函数（来自 useChat）      |
| `updateStreamingFlag`         | `(id: string, streaming: boolean) => Promise<void>` | 更新会话流式状态标记                  |
| `markConversationAsCompleted` | `(id: string) => Promise<void>`                     | 标记会话为已完成                      |
| `resolveConversationId`       | `(id: string) => Promise<string>`                   | 会话 ID 解析函数                      |
| `openAlertDialog`             | `(config: AlertConfig) => void`                     | 打开 Alert 对话框                     |
| `t`                           | `(key: string, fallback?: string) => string`        | 国际化翻译函数                        |
| `toolQueue`                   | `DrainableToolQueue \| undefined`                   | 工具队列（可选）                      |

### 返回值（UseChatNetworkControlResult）

| 属性                      | 类型         | 说明                 |
| ------------------------- | ------------ | -------------------- |
| `showOnlineRecoveryHint`  | `boolean`    | 是否显示网络恢复提示 |
| `dismissRecoveryHint`     | `() => void` | 关闭网络恢复提示     |
| `handleNetworkDisconnect` | `() => void` | 手动触发网络断开处理 |

## 行为说明

### 网络断开时

1. 停止流式响应（调用 `stop()`）
2. 释放聊天锁（调用 `releaseLock()`）
3. 更新会话的流式状态标记（`is_streaming = false`）
4. 标记会话为已完成（清理异常退出状态）
5. 显示断开提示（Alert 对话框）
6. 记录离线状态

### 网络恢复时

1. 检查是否曾经离线过
2. 如果是，显示恢复提示（Alert 对话框）
3. 设置 `showOnlineRecoveryHint = true`
4. 4.8 秒后自动隐藏恢复提示

### 与状态机的协调

- 使用 `stateMachine.getContext()` 获取上下文信息
- 从上下文中获取 `conversationId`（作为后备）
- 不直接修改状态机状态，由外部逻辑负责状态转换

## 注意事项

1. **状态机上下文**: 确保传入的 `stateMachine` 已经初始化了上下文（通过 `initContext`）
2. **会话 ID 解析**: `resolveConversationId` 用于将临时 ID（`temp-xxx`）转换为真实 ID
3. **工具队列**: `toolQueue` 是可选的，如果不传入则不会清空工具队列
4. **国际化**: 需要在 `chat.json` 中定义以下翻译键：
   - `chat:status.networkOffline`
   - `chat:status.networkOfflineDesc`
   - `chat:status.networkOnline`
   - `chat:status.networkOnlineDesc`

## 测试建议

### 单元测试

```typescript
describe("useChatNetworkControl", () => {
  it("should stop streaming when network disconnects", () => {
    const { result } = renderHook(() =>
      useChatNetworkControl({
        isOnline: false,
        isChatStreaming: true,
        stop: mockStop,
        releaseLock: mockReleaseLock,
        // ... 其他参数
      }),
    );

    expect(mockStop).toHaveBeenCalled();
    expect(mockReleaseLock).toHaveBeenCalled();
  });

  it("should show recovery hint when network reconnects", () => {
    const { result, rerender } = renderHook(
      ({ isOnline }) =>
        useChatNetworkControl({
          isOnline,
          // ... 其他参数
        }),
      { initialProps: { isOnline: false } },
    );

    // 模拟网络恢复
    rerender({ isOnline: true });

    expect(result.current.showOnlineRecoveryHint).toBe(true);
  });
});
```

### 集成测试

在 ChatSidebar 的集成测试中验证：

1. 网络断开时流式响应被停止
2. 网络恢复时显示恢复提示
3. Alert 对话框正确显示和关闭

## 相关文档

- [useNetworkStatus Hook](/app/hooks/AGENTS.md#10-usenetworkstatus)
- [useChatLock Hook](/app/hooks/AGENTS.md#9-usechatlock)
- [ChatRunStateMachine](/app/lib/chat-run-state-machine.ts)
- [国际化配置](/app/i18n/AGENTS.md)

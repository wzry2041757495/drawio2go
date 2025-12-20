/**
 * 消息同步状态机
 *
 * 统一管理消息同步状态（storage ↔ UI），避免使用 ref 导致的竞态条件
 *
 * 核心功能：
 * - 定义清晰的同步状态和转换规则
 * - 防止循环同步（storage → UI → storage）
 * - 流式时锁定同步，避免干扰
 * - 支持状态变化订阅
 * - 记录详细的状态转换日志
 *
 * 用途：替代 applyingFromStorageRef，统一管理消息同步方向和生命周期
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("MessageSyncStateMachine");

/**
 * 消息同步状态
 */
export type MessageSyncState =
  | "idle" // 无同步
  | "storage-to-ui" // 存储 → UI
  | "ui-to-storage" // UI → 存储
  | "locked"; // 流式时锁定同步

/**
 * 状态转换事件
 */
export type MessageSyncEvent =
  | "storage-changed" // 存储变化
  | "ui-changed" // UI 变化
  | "sync-complete" // 同步完成
  | "stream-start" // 流式开始
  | "stream-end"; // 流式结束

/**
 * 状态转换表
 *
 * 定义所有合法的状态转换
 */
const STATE_TRANSITIONS: Record<
  MessageSyncState,
  Partial<Record<MessageSyncEvent, MessageSyncState>>
> = {
  idle: {
    "storage-changed": "storage-to-ui",
    "ui-changed": "ui-to-storage",
    "stream-start": "locked",
  },
  "storage-to-ui": {
    "sync-complete": "idle",
    "stream-start": "locked",
  },
  "ui-to-storage": {
    "sync-complete": "idle",
    "stream-start": "locked",
  },
  locked: {
    "stream-end": "idle",
  },
};

/**
 * 消息同步状态机
 *
 * @example
 * // 创建状态机实例
 * const syncStateMachine = new MessageSyncStateMachine();
 *
 * // 流式开始，锁定同步
 * syncStateMachine.transition('stream-start');
 * console.log(syncStateMachine.isLocked()); // true
 *
 * // 流式结束，解锁
 * syncStateMachine.transition('stream-end');
 *
 * // 存储变更，同步到 UI
 * if (syncStateMachine.canTransition('storage-changed')) {
 *   syncStateMachine.transition('storage-changed');
 *   // ... 执行同步逻辑
 *   syncStateMachine.transition('sync-complete');
 * }
 *
 * // 订阅状态变化
 * const unsubscribe = syncStateMachine.subscribe((state) => {
 *   console.log('State changed:', state);
 * });
 */
export class MessageSyncStateMachine {
  private state: MessageSyncState = "idle";
  private listeners: Array<(state: MessageSyncState) => void> = [];

  /**
   * 获取当前状态
   *
   * @returns 当前同步状态
   *
   * @example
   * const state = syncStateMachine.getState();
   * console.log(state); // 'idle' | 'storage-to-ui' | 'ui-to-storage' | 'locked'
   */
  getState(): MessageSyncState {
    return this.state;
  }

  /**
   * 状态转换
   *
   * @param event 触发事件
   * @throws Error 如果转换非法
   *
   * @example
   * // 正常转换
   * syncStateMachine.transition('storage-changed');
   * syncStateMachine.transition('sync-complete');
   *
   * // 非法转换会抛出错误
   * syncStateMachine.transition('ui-changed'); // Error: Invalid state transition
   */
  transition(event: MessageSyncEvent): void {
    const currentState = this.state;
    const transitions = STATE_TRANSITIONS[currentState];
    const nextState = transitions?.[event];

    if (!nextState) {
      const error = new Error(
        `Invalid state transition: ${currentState} -[${event}]-> (no valid transition)`,
      );
      logger.error("Invalid transition", {
        currentState,
        event,
        availableTransitions: Object.keys(transitions || {}),
      });
      throw error;
    }

    logger.info("State transition", {
      from: currentState,
      to: nextState,
      event,
    });

    this.state = nextState;
    this.notifyListeners();
  }

  /**
   * 订阅状态变化
   *
   * @param listener 监听函数
   * @returns 取消订阅函数
   *
   * @example
   * const unsubscribe = syncStateMachine.subscribe((state) => {
   *   console.log('State changed:', state);
   * });
   *
   * // 取消订阅
   * unsubscribe();
   */
  subscribe(listener: (state: MessageSyncState) => void): () => void {
    this.listeners.push(listener);
    logger.debug("Listener subscribed", {
      listenerCount: this.listeners.length,
    });

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
      logger.debug("Listener unsubscribed", {
        listenerCount: this.listeners.length,
      });
    };
  }

  /**
   * 通知所有监听者
   */
  private notifyListeners(): void {
    if (this.listeners.length === 0) return;

    logger.debug("Notifying listeners", {
      listenerCount: this.listeners.length,
      state: this.state,
    });

    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        logger.error("Listener error", { error });
      }
    });
  }

  /**
   * 检查是否可以进行某个转换
   *
   * @param event 事件
   * @returns 是否可以转换
   *
   * @example
   * if (syncStateMachine.canTransition('storage-changed')) {
   *   syncStateMachine.transition('storage-changed');
   *   // ... 执行同步逻辑
   * }
   */
  canTransition(event: MessageSyncEvent): boolean {
    const transitions = STATE_TRANSITIONS[this.state];
    return transitions?.[event] !== undefined;
  }

  /**
   * 检查同步是否被锁定
   *
   * @returns 是否被锁定（流式中）
   *
   * @example
   * if (syncStateMachine.isLocked()) {
   *   console.log('Sync is locked during streaming');
   *   return; // 跳过同步逻辑
   * }
   */
  isLocked(): boolean {
    return this.state === "locked";
  }

  /**
   * 检查是否正在同步
   *
   * @returns 是否正在同步（storage-to-ui 或 ui-to-storage）
   *
   * @example
   * if (syncStateMachine.isSyncing()) {
   *   console.log('Sync in progress');
   *   return; // 等待当前同步完成
   * }
   */
  isSyncing(): boolean {
    return this.state === "storage-to-ui" || this.state === "ui-to-storage";
  }
}

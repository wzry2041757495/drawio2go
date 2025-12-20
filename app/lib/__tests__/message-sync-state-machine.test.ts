import { MessageSyncStateMachine } from "@/lib/message-sync-state-machine";
import type {
  MessageSyncEvent,
  MessageSyncState,
} from "@/lib/message-sync-state-machine";
import { describe, expect, it, vi } from "vitest";

const INVALID_TRANSITION = /Invalid state transition/;

const EVENTS = {
  storageChanged: "storage-changed",
  uiChanged: "ui-changed",
  syncComplete: "sync-complete",
  streamStart: "stream-start",
  streamEnd: "stream-end",
} as const satisfies Record<string, MessageSyncEvent>;

const STATES = {
  idle: "idle",
  storageToUi: "storage-to-ui",
  uiToStorage: "ui-to-storage",
  locked: "locked",
} as const satisfies Record<string, MessageSyncState>;

function runEvents(
  stateMachine: MessageSyncStateMachine,
  events: MessageSyncEvent[],
) {
  events.forEach((event) => stateMachine.transition(event));
}

describe("MessageSyncStateMachine", () => {
  const transitionCases: Array<{
    name: string;
    events: MessageSyncEvent[];
    expected: MessageSyncState;
  }> = [
    {
      name: "idle -> storage-to-ui（storage-changed）",
      events: [EVENTS.storageChanged],
      expected: STATES.storageToUi,
    },
    {
      name: "storage-to-ui -> idle（sync-complete）",
      events: [EVENTS.storageChanged, EVENTS.syncComplete],
      expected: STATES.idle,
    },
    {
      name: "idle -> ui-to-storage（ui-changed）",
      events: [EVENTS.uiChanged],
      expected: STATES.uiToStorage,
    },
    {
      name: "ui-to-storage -> idle（sync-complete）",
      events: [EVENTS.uiChanged, EVENTS.syncComplete],
      expected: STATES.idle,
    },
    {
      name: "idle -> locked（stream-start）",
      events: [EVENTS.streamStart],
      expected: STATES.locked,
    },
    {
      name: "locked -> idle（stream-end）",
      events: [EVENTS.streamStart, EVENTS.streamEnd],
      expected: STATES.idle,
    },
    {
      name: "storage-to-ui -> locked（stream-start）",
      events: [EVENTS.storageChanged, EVENTS.streamStart],
      expected: STATES.locked,
    },
    {
      name: "ui-to-storage -> locked（stream-start）",
      events: [EVENTS.uiChanged, EVENTS.streamStart],
      expected: STATES.locked,
    },
  ];

  it.each(transitionCases)("覆盖合法转换：$name", ({ events, expected }) => {
    const stateMachine = new MessageSyncStateMachine();
    runEvents(stateMachine, events);
    expect(stateMachine.getState()).toBe(expected);
  });

  it("锁定期间拒绝 storage-changed/ui-changed/sync-complete，仅允许 stream-end", () => {
    const stateMachine = new MessageSyncStateMachine();
    stateMachine.transition(EVENTS.streamStart);
    expect(stateMachine.getState()).toBe(STATES.locked);

    expect(stateMachine.canTransition(EVENTS.storageChanged)).toBe(false);
    expect(stateMachine.canTransition(EVENTS.uiChanged)).toBe(false);
    expect(stateMachine.canTransition(EVENTS.syncComplete)).toBe(false);
    expect(stateMachine.canTransition(EVENTS.streamEnd)).toBe(true);

    expect(() => stateMachine.transition(EVENTS.storageChanged)).toThrow(
      INVALID_TRANSITION,
    );
    expect(() => stateMachine.transition(EVENTS.uiChanged)).toThrow(
      INVALID_TRANSITION,
    );
    expect(() => stateMachine.transition(EVENTS.syncComplete)).toThrow(
      INVALID_TRANSITION,
    );

    stateMachine.transition(EVENTS.streamEnd);
    expect(stateMachine.getState()).toBe(STATES.idle);
  });

  describe("防止循环同步（P0）", () => {
    it("当状态是 storage-to-ui 时，触发 ui-changed 必须拒绝", () => {
      const stateMachine = new MessageSyncStateMachine();
      stateMachine.transition(EVENTS.storageChanged);
      expect(stateMachine.getState()).toBe(STATES.storageToUi);

      expect(stateMachine.canTransition(EVENTS.uiChanged)).toBe(false);
      expect(() => stateMachine.transition(EVENTS.uiChanged)).toThrow(
        INVALID_TRANSITION,
      );
      expect(stateMachine.getState()).toBe(STATES.storageToUi);
    });

    it("当状态是 ui-to-storage 时，触发 storage-changed 必须拒绝", () => {
      const stateMachine = new MessageSyncStateMachine();
      stateMachine.transition(EVENTS.uiChanged);
      expect(stateMachine.getState()).toBe(STATES.uiToStorage);

      expect(stateMachine.canTransition(EVENTS.storageChanged)).toBe(false);
      expect(() => stateMachine.transition(EVENTS.storageChanged)).toThrow(
        INVALID_TRANSITION,
      );
      expect(stateMachine.getState()).toBe(STATES.uiToStorage);
    });
  });

  describe("锁定状态边界（P0）", () => {
    it("当状态是 locked 时，再次触发 stream-start 必须抛错（防止重复锁）", () => {
      const stateMachine = new MessageSyncStateMachine();
      stateMachine.transition(EVENTS.streamStart);
      expect(stateMachine.getState()).toBe(STATES.locked);

      expect(stateMachine.canTransition(EVENTS.streamStart)).toBe(false);
      expect(() => stateMachine.transition(EVENTS.streamStart)).toThrow(
        INVALID_TRANSITION,
      );
      expect(stateMachine.getState()).toBe(STATES.locked);
    });

    it("当状态是 idle 时，触发 stream-end 必须抛错（防止乱序解锁）", () => {
      const stateMachine = new MessageSyncStateMachine();
      expect(stateMachine.getState()).toBe(STATES.idle);

      expect(stateMachine.canTransition(EVENTS.streamEnd)).toBe(false);
      expect(() => stateMachine.transition(EVENTS.streamEnd)).toThrow(
        INVALID_TRANSITION,
      );
      expect(stateMachine.getState()).toBe(STATES.idle);
    });

    it.each([
      {
        name: STATES.storageToUi,
        events: [EVENTS.storageChanged] satisfies MessageSyncEvent[],
      },
      {
        name: STATES.uiToStorage,
        events: [EVENTS.uiChanged] satisfies MessageSyncEvent[],
      },
    ])(
      "当状态是 $name 时，触发 stream-end 必须抛错",
      ({ events, name }) => {
        const stateMachine = new MessageSyncStateMachine();
        runEvents(stateMachine, events);
        expect(stateMachine.getState()).toBe(name);

        expect(stateMachine.canTransition(EVENTS.streamEnd)).toBe(false);
        expect(() => stateMachine.transition(EVENTS.streamEnd)).toThrow(
          INVALID_TRANSITION,
        );
        expect(stateMachine.getState()).toBe(name);
      },
    );
  });

  describe("辅助方法（P1）", () => {
    it.each([
      {
        name: "idle",
        events: [] satisfies MessageSyncEvent[],
        isLocked: false,
        isSyncing: false,
      },
      {
        name: "storage-to-ui",
        events: [EVENTS.storageChanged] satisfies MessageSyncEvent[],
        isLocked: false,
        isSyncing: true,
      },
      {
        name: "ui-to-storage",
        events: [EVENTS.uiChanged] satisfies MessageSyncEvent[],
        isLocked: false,
        isSyncing: true,
      },
      {
        name: "locked",
        events: [EVENTS.streamStart] satisfies MessageSyncEvent[],
        isLocked: true,
        isSyncing: false,
      },
    ])(
      "isLocked/isSyncing：当状态是 $name 时返回正确结果",
      ({ events, isLocked, isSyncing }) => {
        const stateMachine = new MessageSyncStateMachine();
        runEvents(stateMachine, events);
        expect(stateMachine.isLocked()).toBe(isLocked);
        expect(stateMachine.isSyncing()).toBe(isSyncing);
      },
    );
  });

  describe("订阅与取消订阅（P1）", () => {
    it("subscribe/unsubscribe：监听器可接收 from/to/event，取消订阅后不再触发", () => {
      const stateMachine = new MessageSyncStateMachine();
      const listener = vi.fn();

      const unsubscribe = stateMachine.subscribe(listener);

      stateMachine.transition(EVENTS.storageChanged);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(
        STATES.storageToUi,
        expect.objectContaining({
          from: STATES.idle,
          to: STATES.storageToUi,
          event: EVENTS.storageChanged,
        }),
      );

      unsubscribe();
      stateMachine.transition(EVENTS.syncComplete);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  it("监听器抛错隔离（P1）：不影响状态机继续运行，也不影响其他监听器", () => {
    const stateMachine = new MessageSyncStateMachine();
    const okListener = vi.fn();

    stateMachine.subscribe(() => {
      throw new Error("listener boom");
    });
    stateMachine.subscribe(okListener);

    expect(() => stateMachine.transition(EVENTS.storageChanged)).not.toThrow();
    expect(stateMachine.getState()).toBe(STATES.storageToUi);
    expect(okListener).toHaveBeenCalledWith(
      STATES.storageToUi,
      expect.objectContaining({
        from: STATES.idle,
        to: STATES.storageToUi,
        event: EVENTS.storageChanged,
      }),
    );

    expect(() => stateMachine.transition(EVENTS.syncComplete)).not.toThrow();
    expect(stateMachine.getState()).toBe(STATES.idle);
    expect(okListener).toHaveBeenLastCalledWith(
      STATES.idle,
      expect.objectContaining({
        from: STATES.storageToUi,
        to: STATES.idle,
        event: EVENTS.syncComplete,
      }),
    );
  });

  it("非法转换会抛错", () => {
    const stateMachine = new MessageSyncStateMachine();
    expect(() => stateMachine.transition(EVENTS.syncComplete)).toThrow(
      INVALID_TRANSITION,
    );
    expect(stateMachine.getState()).toBe(STATES.idle);
  });
});

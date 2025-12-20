import { ChatRunStateMachine } from "@/lib/chat-run-state-machine";
import type { ChatRunEvent, ChatRunState } from "@/lib/chat-run-state-machine";
import { describe, expect, it, vi } from "vitest";

const SUBMIT: ChatRunEvent = "submit";
const LOCK_ACQUIRED: ChatRunEvent = "lock-acquired";
const LOCK_FAILED: ChatRunEvent = "lock-failed";
const FINISH_WITH_TOOLS: ChatRunEvent = "finish-with-tools";
const FINISH_NO_TOOLS: ChatRunEvent = "finish-no-tools";
const TOOLS_CONTINUE: ChatRunEvent = "tools-complete-continue";
const TOOLS_DONE: ChatRunEvent = "tools-complete-done";
const FINALIZE_COMPLETE: ChatRunEvent = "finalize-complete";
const CANCEL: ChatRunEvent = "cancel";
const CANCEL_COMPLETE: ChatRunEvent = "cancel-complete";
const ERROR: ChatRunEvent = "error";
const ERROR_CLEANUP: ChatRunEvent = "error-cleanup";

function runEvents(stateMachine: ChatRunStateMachine, events: ChatRunEvent[]) {
  events.forEach((event) => stateMachine.transition(event));
}

describe("ChatRunStateMachine", () => {
  describe("状态转换", () => {
    const transitionCases: Array<{
      name: string;
      events: ChatRunEvent[];
      expected: ChatRunState;
    }> = [
      { name: "idle -> preparing（submit）", events: [SUBMIT], expected: "preparing" },
      {
        name: "preparing -> streaming（lock-acquired）",
        events: [SUBMIT, LOCK_ACQUIRED],
        expected: "streaming",
      },
      {
        name: "preparing -> idle（lock-failed）",
        events: [SUBMIT, LOCK_FAILED],
        expected: "idle",
      },
      {
        name: "preparing -> errored（error）",
        events: [SUBMIT, ERROR],
        expected: "errored",
      },
      {
        name: "streaming -> tools-pending（finish-with-tools）",
        events: [SUBMIT, LOCK_ACQUIRED, FINISH_WITH_TOOLS],
        expected: "tools-pending",
      },
      {
        name: "streaming -> finalizing（finish-no-tools）",
        events: [SUBMIT, LOCK_ACQUIRED, FINISH_NO_TOOLS],
        expected: "finalizing",
      },
      {
        name: "streaming -> cancelled（cancel）",
        events: [SUBMIT, LOCK_ACQUIRED, CANCEL],
        expected: "cancelled",
      },
      {
        name: "streaming -> errored（error）",
        events: [SUBMIT, LOCK_ACQUIRED, ERROR],
        expected: "errored",
      },
      {
        name: "tools-pending -> streaming（tools-complete-continue）",
        events: [SUBMIT, LOCK_ACQUIRED, FINISH_WITH_TOOLS, TOOLS_CONTINUE],
        expected: "streaming",
      },
      {
        name: "tools-pending -> finalizing（tools-complete-done）",
        events: [SUBMIT, LOCK_ACQUIRED, FINISH_WITH_TOOLS, TOOLS_DONE],
        expected: "finalizing",
      },
      {
        name: "tools-pending -> cancelled（cancel）",
        events: [SUBMIT, LOCK_ACQUIRED, FINISH_WITH_TOOLS, CANCEL],
        expected: "cancelled",
      },
      {
        name: "tools-pending -> errored（error）",
        events: [SUBMIT, LOCK_ACQUIRED, FINISH_WITH_TOOLS, ERROR],
        expected: "errored",
      },
      {
        name: "finalizing -> idle（finalize-complete）",
        events: [SUBMIT, LOCK_ACQUIRED, FINISH_NO_TOOLS, FINALIZE_COMPLETE],
        expected: "idle",
      },
      {
        name: "finalizing -> errored（error）",
        events: [SUBMIT, LOCK_ACQUIRED, FINISH_NO_TOOLS, ERROR],
        expected: "errored",
      },
      {
        name: "cancelled -> idle（cancel-complete）",
        events: [SUBMIT, LOCK_ACQUIRED, CANCEL, CANCEL_COMPLETE],
        expected: "idle",
      },
      {
        name: "errored -> idle（error-cleanup）",
        events: [SUBMIT, ERROR, ERROR_CLEANUP],
        expected: "idle",
      },
    ];

    it.each(transitionCases)("覆盖合法转换：$name", ({ events, expected }) => {
      const stateMachine = new ChatRunStateMachine();
      runEvents(stateMachine, events);
      expect(stateMachine.getState()).toBe(expected);
    });

    it("从 streaming 出错后可以清理回 idle", () => {
      const stateMachine = new ChatRunStateMachine();

      runEvents(stateMachine, [SUBMIT, LOCK_ACQUIRED]);
      expect(stateMachine.getState()).toBe("streaming");

      stateMachine.transition(ERROR);
      expect(stateMachine.getState()).toBe("errored");

      stateMachine.transition(ERROR_CLEANUP);
      expect(stateMachine.getState()).toBe("idle");
    });

    it("从 tools-pending 出错后可以清理回 idle", () => {
      const stateMachine = new ChatRunStateMachine();

      runEvents(stateMachine, [SUBMIT, LOCK_ACQUIRED, FINISH_WITH_TOOLS]);
      expect(stateMachine.getState()).toBe("tools-pending");

      stateMachine.transition(ERROR);
      expect(stateMachine.getState()).toBe("errored");

      stateMachine.transition(ERROR_CLEANUP);
      expect(stateMachine.getState()).toBe("idle");
    });

    it("从 finalizing 出错后可以清理回 idle", () => {
      const stateMachine = new ChatRunStateMachine();

      runEvents(stateMachine, [SUBMIT, LOCK_ACQUIRED, FINISH_NO_TOOLS]);
      expect(stateMachine.getState()).toBe("finalizing");

      stateMachine.transition(ERROR);
      expect(stateMachine.getState()).toBe("errored");

      stateMachine.transition(ERROR_CLEANUP);
      expect(stateMachine.getState()).toBe("idle");
    });

    it("非法转换会抛错", () => {
      const stateMachine = new ChatRunStateMachine();

      expect(() => stateMachine.transition(FINISH_NO_TOOLS)).toThrow(
        /Invalid state transition/,
      );
      expect(stateMachine.getState()).toBe("idle");
    });

    it("检测 streaming-start 悬空：定义了事件但转换表不支持", () => {
      const cases: Array<{ state: ChatRunState; events: ChatRunEvent[] }> = [
        { state: "idle", events: [] },
        { state: "preparing", events: [SUBMIT] },
        { state: "streaming", events: [SUBMIT, LOCK_ACQUIRED] },
        { state: "tools-pending", events: [SUBMIT, LOCK_ACQUIRED, FINISH_WITH_TOOLS] },
        { state: "finalizing", events: [SUBMIT, LOCK_ACQUIRED, FINISH_NO_TOOLS] },
        { state: "cancelled", events: [SUBMIT, LOCK_ACQUIRED, CANCEL] },
        { state: "errored", events: [SUBMIT, ERROR] },
      ];

      for (const { state, events } of cases) {
        const stateMachine = new ChatRunStateMachine();
        runEvents(stateMachine, events);
        expect(stateMachine.getState()).toBe(state);
        expect(stateMachine.canTransition("streaming-start")).toBe(false);
        expect(stateMachine.transition.bind(stateMachine, "streaming-start")).toThrow(
          /Invalid state transition/,
        );
      }
    });
  });

  it("subscribe/unsubscribe：监听器可接收状态与上下文", () => {
    const stateMachine = new ChatRunStateMachine();
    stateMachine.initContext("conv-1");

    const listener = vi.fn();
    const unsubscribe = stateMachine.subscribe(listener);

    stateMachine.transition(SUBMIT);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      "preparing",
      expect.objectContaining({
        conversationId: "conv-1",
        lockAcquired: false,
      }),
    );

    unsubscribe();
    stateMachine.transition(LOCK_FAILED);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("监听器抛错不影响状态机与其他监听器", () => {
    const stateMachine = new ChatRunStateMachine();
    const okListener = vi.fn();

    stateMachine.subscribe(() => {
      throw new Error("listener boom");
    });
    stateMachine.subscribe(okListener);

    expect(() => stateMachine.transition(SUBMIT)).not.toThrow();
    expect(stateMachine.getState()).toBe("preparing");
    expect(okListener).toHaveBeenCalledWith("preparing", null);
  });
});

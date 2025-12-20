import { DrainableToolQueue } from "@/lib/drainable-tool-queue";
import { describe, expect, it, vi } from "vitest";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function getDrainWaiterCount(queue: DrainableToolQueue): number {
  return (queue as unknown as { drainWaiters: unknown[] }).drainWaiters.length;
}

describe("DrainableToolQueue", () => {
  it("空队列 drain 立即返回（不会挂起或超时）", async () => {
    vi.useFakeTimers();
    try {
      const queue = new DrainableToolQueue();
      expect(getDrainWaiterCount(queue)).toBe(0);

      const p = queue.drain(1000);
      await expect(p).resolves.toBeUndefined();
      expect(getDrainWaiterCount(queue)).toBe(0);

      await vi.advanceTimersByTimeAsync(1000);
      await expect(p).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("串行顺序保证（FIFO）", async () => {
    const queue = new DrainableToolQueue();
    const order: number[] = [];

    queue.enqueue(async () => {
      order.push(1);
    });
    queue.enqueue(async () => {
      order.push(2);
    });
    queue.enqueue(async () => {
      order.push(3);
    });

    await queue.drain(1000);
    expect(order).toEqual([1, 2, 3]);
  });

  it("单任务失败不阻断后续任务", async () => {
    const queue = new DrainableToolQueue();
    const order: string[] = [];

    queue.enqueue(async () => {
      order.push("a");
      throw new Error("boom");
    });
    queue.enqueue(async () => {
      order.push("b");
    });

    await queue.drain(1000);
    expect(order).toEqual(["a", "b"]);
  });

  it("多 waiter 同时等待 drain 都能被 resolve", async () => {
    const queue = new DrainableToolQueue();
    const gate = createDeferred<void>();

    queue.enqueue(async () => {
      await gate.promise;
    });

    const p1 = queue.drain(1000);
    const p2 = queue.drain(1000);

    gate.resolve();
    await expect(Promise.all([p1, p2])).resolves.toEqual([undefined, undefined]);
  });

  it("drain 超时路径（fake timers）", async () => {
    vi.useFakeTimers();
    try {
      const queue = new DrainableToolQueue();
      queue.enqueue(async () => new Promise<void>(() => {}));

      const p = queue.drain(1000);
      const expectation = expect(p).rejects.toThrow(/drain timeout/i);
      await vi.advanceTimersByTimeAsync(1000);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });

  it("drain 超时后会清理 waiter，且后续 drain 仍可正常工作", async () => {
    vi.useFakeTimers();
    try {
      const queue = new DrainableToolQueue();
      const gate = createDeferred<void>();

      queue.enqueue(async () => {
        await gate.promise;
      });

      expect(getDrainWaiterCount(queue)).toBe(0);

      const firstDrain = queue.drain(100);
      const firstExpectation = expect(firstDrain).rejects.toThrow(/drain timeout/i);
      expect(getDrainWaiterCount(queue)).toBe(1);

      await vi.advanceTimersByTimeAsync(100);
      await firstExpectation;
      expect(getDrainWaiterCount(queue)).toBe(0);

      const secondDrain = queue.drain(100);
      expect(getDrainWaiterCount(queue)).toBe(1);

      gate.resolve();
      await Promise.resolve();
      await expect(secondDrain).resolves.toBeUndefined();
      expect(getDrainWaiterCount(queue)).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("取消时立即丢弃剩余任务（不等待未开始任务执行）", async () => {
    const queue = new DrainableToolQueue();
    const started = createDeferred<void>();
    const allowFinish = createDeferred<void>();
    const order: string[] = [];

    queue.enqueue(async () => {
      order.push("t1-start");
      started.resolve();
      await allowFinish.promise;
      order.push("t1-end");
    });
    queue.enqueue(async () => {
      order.push("t2");
    });
    queue.enqueue(async () => {
      order.push("t3");
    });

    await started.promise;
    expect(queue.cancel()).toBe(2);

    allowFinish.resolve();
    await queue.drain(1000);
    expect(order).toEqual(["t1-start", "t1-end"]);
  });

  it("cancel() 无任务时返回 0", () => {
    const queue = new DrainableToolQueue();
    expect(queue.cancel()).toBe(0);
    expect(queue.getPendingCount()).toBe(0);
  });

  it("取消会释放正在等待的 drain（关键取消链路）", async () => {
    vi.useFakeTimers();
    try {
      const queue = new DrainableToolQueue();
      const started = createDeferred<void>();
      const allowFinish = createDeferred<void>();
      const order: string[] = [];

      queue.enqueue(async () => {
        order.push("t1-start");
        started.resolve();
        await allowFinish.promise;
        order.push("t1-end");
      });
      queue.enqueue(async () => {
        order.push("t2");
      });

      const drainPromise = queue.drain(200);
      let drained = false;
      drainPromise.then(() => {
        drained = true;
      });

      await started.promise;
      expect(queue.cancel()).toBe(1);

      await Promise.resolve();
      expect(drained).toBe(false);
      expect(order).toEqual(["t1-start"]);

      allowFinish.resolve();
      await vi.advanceTimersByTimeAsync(250);
      await expect(drainPromise).resolves.toBeUndefined();
      expect(order).toEqual(["t1-start", "t1-end"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("getPendingCount() 计数正确性（enqueue/完成/cancel）", async () => {
    const queue = new DrainableToolQueue();
    expect(queue.getPendingCount()).toBe(0);

    const started = createDeferred<void>();
    const allowFinish = createDeferred<void>();

    queue.enqueue(async () => {
      started.resolve();
      await allowFinish.promise;
    });
    expect(queue.getPendingCount()).toBe(1);

    queue.enqueue(async () => {});
    expect(queue.getPendingCount()).toBe(2);

    await started.promise;
    expect(queue.getPendingCount()).toBe(2);

    expect(queue.cancel()).toBe(1);
    expect(queue.getPendingCount()).toBe(1);

    allowFinish.resolve();
    await queue.drain(1000);
    expect(queue.getPendingCount()).toBe(0);
  });

  it("队列语义：drain() 只等待调用时已入队的任务", async () => {
    const queue = new DrainableToolQueue();
    const firstGate = createDeferred<void>();
    const secondGate = createDeferred<void>();
    let secondCompleted = false;

    queue.enqueue(async () => {
      await firstGate.promise;
    });

    const drainSnapshot = queue.drain(1000);

    queue.enqueue(async () => {
      await secondGate.promise;
      secondCompleted = true;
    });

    firstGate.resolve();
    await drainSnapshot;
    expect(secondCompleted).toBe(false);

    secondGate.resolve();
    await queue.drain(1000);
    expect(secondCompleted).toBe(true);
  });

  it("drain(timeout=0) 语义：禁用超时，一直等待到快照任务完成/取消", async () => {
    vi.useFakeTimers();
    try {
      const queue = new DrainableToolQueue();
      const gate = createDeferred<void>();

      queue.enqueue(async () => {
        await gate.promise;
      });

      let resolved = false;
      let rejected = false;
      const drainPromise = queue.drain(0);
      drainPromise.then(
        () => {
          resolved = true;
        },
        () => {
          rejected = true;
        },
      );

      await Promise.resolve();
      expect(getDrainWaiterCount(queue)).toBe(1);
      expect(resolved).toBe(false);
      expect(rejected).toBe(false);

      await vi.advanceTimersByTimeAsync(60_000);
      await Promise.resolve();
      expect(resolved).toBe(false);
      expect(rejected).toBe(false);

      gate.resolve();
      await expect(drainPromise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

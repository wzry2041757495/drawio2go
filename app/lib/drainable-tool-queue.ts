/**
 * 可等待清空的工具执行队列
 *
 * 核心功能：
 * - 串行执行工具任务，保持执行顺序
 * - 提供 drain() 方法等待队列清空（快照语义：只等待调用时已入队的任务）
 * - 支持多个调用者同时等待队列清空
 * - 单个任务失败不影响队列继续执行
 * - 带超时保护，防止永久阻塞
 * - 支持 cancel() 丢弃未开始的任务（取消/断网等场景无需等待）
 *
 * 用途：确保 onFinish 等待工具队列完成后再保存消息和释放锁
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("DrainableToolQueue");

export class DrainableToolQueue {
  // 自增任务 ID（用于 drain 的“快照语义”）
  private nextTaskId = 1;

  // 已完成/已取消任务的连续最大 ID（从 1 开始递增）
  private settledUpTo = 0;

  // 已完成/已取消的任务 ID（用于处理 cancel 导致的“跳号”）
  private settledIds = new Set<number>();

  // 待执行任务计数器
  private pendingCount = 0;

  // 待执行任务队列（保持 FIFO）
  private tasks: Array<{ id: number; task: () => Promise<void> }> = [];

  // 当前是否正在处理队列（防止重复启动 worker）
  private isProcessing = false;

  // 当前正在执行的任务 ID（用于 drain 超时错误信息）
  private runningTaskId: number | null = null;

  // 等待 drain 的 waiter 列表（支持多个并发 drain）
  private drainWaiters: Array<{
    targetId: number;
    resolve: () => void;
    reject: (error: unknown) => void;
    timer: ReturnType<typeof setTimeout> | null;
  }> = [];

  /**
   * 将任务添加到队列
   *
   * @param task 异步任务函数
   *
   * @example
   * queue.enqueue(async () => {
   *   await executeToolCall(toolCall);
   * });
   */
  enqueue(task: () => Promise<void>): void {
    const id = this.nextTaskId++;
    this.pendingCount++;
    this.tasks.push({ id, task });
    logger.debug("Task enqueued", { pendingCount: this.pendingCount, id });

    this.startProcessing();
  }

  /**
   * 等待队列清空
   *
   * - **快照语义**：只等待调用时已经入队的任务（不包含之后入队的任务）
   * - 如果快照范围内任务已完成/取消，立即返回
   * - 否则阻塞等待快照范围内任务全部完成/取消
   * - 支持超时保护（默认 60 秒）
   *
   * @param timeout 超时时间（毫秒），默认 60000ms
   * @returns Promise<void>
   * @throws Error 如果超时
   *
   * @example
   * await queue.drain(); // 等待所有工具完成
   */
  async drain(timeout = 60000): Promise<void> {
    const targetId = this.nextTaskId - 1;
    if (targetId <= this.settledUpTo) {
      logger.debug("Queue already drained for snapshot, drain immediately", {
        targetId,
        settledUpTo: this.settledUpTo,
      });
      return;
    }

    logger.info("Waiting for queue to drain", {
      pendingCount: this.pendingCount,
      timeout,
      targetId,
    });

    return await new Promise<void>((resolve, reject) => {
      const waiter = {
        targetId,
        resolve: () => {
          if (waiter.timer) clearTimeout(waiter.timer);
          resolve();
        },
        reject: (error: unknown) => {
          if (waiter.timer) clearTimeout(waiter.timer);
          reject(error);
        },
        timer: null as ReturnType<typeof setTimeout> | null,
      };

      if (timeout > 0) {
        waiter.timer = setTimeout(() => {
          const stillPending = this.countPendingUpTo(targetId);
          const error = new Error(
            `Tool queue drain timeout after ${timeout}ms (${stillPending} tasks still pending)`,
          );
          this.drainWaiters = this.drainWaiters.filter((w) => w !== waiter);
          logger.error("Queue drain failed", {
            error,
            pendingCount: this.pendingCount,
            targetId,
          });
          waiter.reject(error);
        }, timeout);
      }

      this.drainWaiters.push(waiter);
      this.flushDrainWaiters();
    });
  }

  /**
   * 获取待执行任务数量
   *
   * @returns 待执行任务数
   *
   * @example
   * const count = queue.getPendingCount();
   * console.log(`${count} tasks pending`);
   */
  getPendingCount(): number {
    return this.pendingCount;
  }

  /**
   * 取消（丢弃）当前尚未开始执行的任务
   *
   * - 不会中止正在执行中的任务（中止应由外部 AbortController 负责）
   * - 被丢弃的任务会被视为“已完成”，以便 drain 快照等待能正常结束
   *
   * @returns 被丢弃的任务数量
   */
  cancel(): number {
    const cancelled = this.tasks.splice(0);
    if (cancelled.length === 0) return 0;

    this.pendingCount -= cancelled.length;
    logger.info("Cancelled pending tasks", {
      cancelledCount: cancelled.length,
      pendingCount: this.pendingCount,
    });

    cancelled.forEach(({ id }) => this.markTaskSettled(id));
    this.flushDrainWaiters();
    return cancelled.length;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.tasks.length > 0) {
        const next = this.tasks.shift();
        if (!next) break;

        this.runningTaskId = next.id;
        try {
          await next.task();
          logger.debug("Task completed successfully", { id: next.id });
        } catch (error) {
          // 单个任务失败不影响队列继续
          logger.error("Task failed", { error, id: next.id });
        } finally {
          this.runningTaskId = null;
          this.pendingCount--;
          logger.debug("Task finished", {
            pendingCount: this.pendingCount,
            id: next.id,
          });
          this.markTaskSettled(next.id);
          this.flushDrainWaiters();
        }
      }
    } finally {
      this.isProcessing = false;
      if (this.tasks.length > 0) {
        this.startProcessing();
      }
    }
  }

  private startProcessing(): void {
    this.processQueue().catch((error) => {
      logger.error("Queue processing failed", { error });
    });
  }

  private markTaskSettled(id: number): void {
    this.settledIds.add(id);
    while (this.settledIds.has(this.settledUpTo + 1)) {
      this.settledIds.delete(this.settledUpTo + 1);
      this.settledUpTo++;
    }
  }

  private flushDrainWaiters(): void {
    if (this.drainWaiters.length === 0) return;

    const ready = this.drainWaiters.filter((w) => w.targetId <= this.settledUpTo);
    if (ready.length === 0) return;

    logger.info("Queue drained for snapshot, resolving waiters", {
      waiterCount: ready.length,
      settledUpTo: this.settledUpTo,
    });

    ready.forEach((w) => w.resolve());
    this.drainWaiters = this.drainWaiters.filter((w) => w.targetId > this.settledUpTo);
  }

  private countPendingUpTo(targetId: number): number {
    const queued = this.tasks.filter((t) => t.id <= targetId).length;
    const running =
      this.runningTaskId !== null && this.runningTaskId <= targetId ? 1 : 0;
    return queued + running;
  }
}

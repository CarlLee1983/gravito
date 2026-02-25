import type { Span } from '@opentelemetry/api'
import type { ActionCallback } from '../HookManager'
import type { BackpressureManager } from './BackpressureManager'
import type { DeadLetterQueue } from './DeadLetterQueue'
import type { EventBackend } from './EventBackend'
import type { EventOptions } from './EventOptions'
import type { EventMetrics } from './observability/EventMetrics'
import type { EventTracing } from './observability/EventTracing'
import type { OTelEventMetrics } from './observability/OTelEventMetrics'
import type { PriorityStatistics } from './PriorityEscalationManager'
import { QueueCore } from './queue-core'
import type { RetryScheduler } from './RetryScheduler'
import { TaskExecutor } from './task-executor'
import type {
  BackpressureStrategy,
  EventQueueConfig,
  EventTask,
  MultiPriorityQueueDepth,
} from './types'
import type { WorkerPool } from './WorkerPool'

export type { EventTask, EventQueueConfig, BackpressureStrategy }

/**
 * Priority queue for event processing.
 * Events are processed based on their priority level:
 * - Critical priority events are processed first (< 1ms)
 * - High priority events are processed second (< 50ms)
 * - Normal priority events are processed third (< 200ms)
 * - Low priority events are processed last (< 500ms)
 *
 * Supports automatic priority escalation based on wait time.
 *
 * Composed of:
 * - {@link QueueCore}: queue data structures and backpressure logic
 * - {@link TaskExecutor}: task execution, retry, circuit breaker, DLQ
 *
 * @internal
 */
export class EventPriorityQueue implements EventBackend {
  private queueCore: QueueCore
  private taskExecutor: TaskExecutor
  private processing = false
  private workerPool?: WorkerPool

  constructor(config: EventQueueConfig = {}) {
    this.queueCore = new QueueCore(config)
    this.taskExecutor = new TaskExecutor()
    this.taskExecutor.setEnqueueRetryFn((task) => {
      this.queueCore.enqueueRetry(task)
      if (!this.processing) {
        this.processNext()
      }
    })
  }

  // ========== DLQ ==========

  setDeadLetterQueue(dlq: DeadLetterQueue): void {
    this.queueCore.setDeadLetterQueue(dlq)
    this.taskExecutor.setDeadLetterQueue(dlq)
  }

  setPersistentDLQHandler(
    handler: (
      hook: string,
      args: unknown,
      options: EventOptions,
      error: Error,
      retryCount: number,
      firstFailedAt: number
    ) => Promise<void>
  ): void {
    this.taskExecutor.setPersistentDLQHandler(handler)
  }

  // ========== Observability ==========

  setEventMetrics(metrics: EventMetrics): void {
    this.taskExecutor.setEventMetrics(metrics)
  }

  setOTelEventMetrics(metrics: OTelEventMetrics): void {
    this.queueCore.setOTelEventMetrics(metrics)
    this.taskExecutor.setOTelEventMetrics(metrics)
  }

  setPriorityStatistics(stats: PriorityStatistics): void {
    this.queueCore.setPriorityStatistics(stats)
  }

  getPriorityStatistics(): PriorityStatistics | undefined {
    return this.queueCore.getPriorityStatistics()
  }

  setEventTracing(tracing: EventTracing): void {
    this.taskExecutor.setEventTracing(tracing)
  }

  setCurrentDispatchSpan(span: Span | undefined): void {
    this.taskExecutor.setCurrentDispatchSpan(span)
  }

  getCurrentDispatchSpan(): Span | undefined {
    return this.taskExecutor.getCurrentDispatchSpan()
  }

  // ========== Retry Scheduler ==========

  setRetryScheduler(scheduler: RetryScheduler): void {
    this.taskExecutor.setRetryScheduler(scheduler)
  }

  getRetryScheduler(): RetryScheduler | undefined {
    return this.taskExecutor.getRetryScheduler()
  }

  // ========== Circuit Breaker ==========

  getCircuitBreaker(hook: string) {
    return this.taskExecutor.getCircuitBreaker(hook)
  }

  getCircuitBreakers() {
    return this.taskExecutor.getCircuitBreakers()
  }

  resetCircuitBreaker(hook: string): boolean {
    return this.taskExecutor.resetCircuitBreaker(hook)
  }

  // ========== Worker Pool ==========

  setWorkerPool(pool: WorkerPool): void {
    this.workerPool = pool
  }

  getWorkerPool(): WorkerPool | undefined {
    return this.workerPool
  }

  // ========== Backpressure ==========

  getBackpressureManager(): BackpressureManager | undefined {
    return this.queueCore.getBackpressureManager()
  }

  // ========== Enqueue ==========

  /*
   * Enqueue an event task.
   */
  enqueue(task: EventTask): string
  enqueue(hook: string, args: unknown, callbacks: ActionCallback[], options: EventOptions): string
  enqueue(
    hookOrTask: string | EventTask,
    args?: unknown,
    callbacks?: ActionCallback[],
    options?: EventOptions
  ): string {
    let task: EventTask

    if (typeof hookOrTask !== 'string') {
      task = hookOrTask
    } else {
      const taskId = this.queueCore.createTaskId()
      const nowMs = Date.now()
      task = {
        id: taskId,
        hook: hookOrTask,
        args,
        options: options!,
        callbacks: callbacks!,
        createdAt: nowMs,
        enqueuedAt: nowMs,
        partitionKey: options?.partitionKey,
        retryCount: 0,
      }
    }

    const result = this.queueCore.enqueue(task)

    if (result.status === 'dropped') {
      return 'dropped'
    }

    if (result.status === 'delayed') {
      setTimeout(() => {
        this.enqueue(task)
      }, result.delayMs)
      return result.id
    }

    // Task was successfully queued - trigger processing
    const finalPriority = task.options.priority || 'normal'
    if (finalPriority === 'critical') {
      if (!this.processing) {
        setImmediate(() => this.processNext())
      }
    } else if (!this.processing) {
      this.processNext()
    }

    return result.id
  }

  enqueueBatch(tasks: EventTask[]): string[] {
    const taskIds: string[] = []

    for (const task of tasks) {
      const id = this.enqueue(task)
      taskIds.push(id)
    }

    if (tasks.length > 0 && !this.processing) {
      setImmediate(() => this.processNext())
    }

    return taskIds
  }

  // ========== Depth ==========

  getDepth(): number {
    return this.queueCore.getDepth()
  }

  getDepthByPriority(priority: 'critical' | 'high' | 'normal' | 'low'): number {
    return this.queueCore.getDepthByPriority(priority)
  }

  getQueueDepthByPriority(): MultiPriorityQueueDepth {
    return this.queueCore.getQueueDepthByPriority()
  }

  clear(): void {
    this.queueCore.clear()
  }

  dequeue(): EventTask | undefined {
    return this.queueCore.dequeue()
  }

  // ========== Internal Processing ==========

  private async processNext(): Promise<void> {
    if (this.processing) {
      return
    }

    const task = this.queueCore.dequeue()
    if (!task) {
      return
    }

    this.processing = true

    try {
      if (this.workerPool) {
        await this.workerPool.submitTask(task)
      } else {
        await this.taskExecutor.executeTask(task, this.queueCore.processingPartitions)
      }
    } catch (error) {
      console.error(`[EventPriorityQueue] Error processing task ${task.id}:`, error)
    } finally {
      this.processing = false
      this.queueCore.syncBackpressure()
      setImmediate(() => this.processNext())
    }
  }
}

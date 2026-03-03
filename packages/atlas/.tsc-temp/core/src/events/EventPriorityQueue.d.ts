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
import type { RetryScheduler } from './RetryScheduler'
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
export declare class EventPriorityQueue implements EventBackend {
  private queueCore
  private taskExecutor
  private processing
  private workerPool?
  constructor(config?: EventQueueConfig)
  setDeadLetterQueue(dlq: DeadLetterQueue): void
  setPersistentDLQHandler(
    handler: (
      hook: string,
      args: unknown,
      options: EventOptions,
      error: Error,
      retryCount: number,
      firstFailedAt: number
    ) => Promise<void>
  ): void
  setEventMetrics(metrics: EventMetrics): void
  setOTelEventMetrics(metrics: OTelEventMetrics): void
  setPriorityStatistics(stats: PriorityStatistics): void
  getPriorityStatistics(): PriorityStatistics | undefined
  setEventTracing(tracing: EventTracing): void
  setCurrentDispatchSpan(span: Span | undefined): void
  getCurrentDispatchSpan(): Span | undefined
  setRetryScheduler(scheduler: RetryScheduler): void
  getRetryScheduler(): RetryScheduler | undefined
  getCircuitBreaker(hook: string): import('./CircuitBreaker').CircuitBreaker
  getCircuitBreakers(): Map<string, import('./CircuitBreaker').CircuitBreaker>
  resetCircuitBreaker(hook: string): boolean
  setWorkerPool(pool: WorkerPool): void
  getWorkerPool(): WorkerPool | undefined
  getBackpressureManager(): BackpressureManager | undefined
  enqueue(task: EventTask): string
  enqueue(hook: string, args: unknown, callbacks: ActionCallback[], options: EventOptions): string
  enqueueBatch(tasks: EventTask[]): string[]
  getDepth(): number
  getDepthByPriority(priority: 'critical' | 'high' | 'normal' | 'low'): number
  getQueueDepthByPriority(): MultiPriorityQueueDepth
  clear(): void
  dequeue(): EventTask | undefined
  private processNext
}

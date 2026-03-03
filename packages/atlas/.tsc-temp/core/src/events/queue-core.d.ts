import { BackpressureManager } from './BackpressureManager'
import type { DeadLetterQueue } from './DeadLetterQueue'
import type { OTelEventMetrics } from './observability/OTelEventMetrics'
import { type PriorityStatistics } from './PriorityEscalationManager'
import type {
  BackpressureStrategy,
  EventQueueConfig,
  EventTask,
  MultiPriorityQueueDepth,
} from './types'
/**
 * Result of an enqueue operation.
 *
 * - `{ status: 'queued', id }` - Task successfully queued
 * - `{ status: 'dropped' }` - Task dropped due to backpressure
 * - `{ status: 'delayed', id, delayMs }` - Task should be re-enqueued after delayMs
 *
 * @internal
 */
export type EnqueueResult =
  | {
      status: 'queued'
      id: string
    }
  | {
      status: 'dropped'
    }
  | {
      status: 'delayed'
      id: string
      delayMs: number
    }
/**
 * Priority queue core: manages event task queues and backpressure.
 *
 * Handles enqueueing, dequeuing, backpressure logic, and priority escalation.
 * This class is used internally by EventPriorityQueue as a composition target.
 *
 * @internal
 */
export declare class QueueCore {
  criticalPriority: EventTask[]
  highPriority: EventTask[]
  normalPriority: EventTask[]
  lowPriority: EventTask[]
  processingPartitions: Set<string>
  private taskIdCounter
  private dlq?
  private otelEventMetrics?
  private backpressureManager?
  private priorityStats?
  private config
  constructor(config?: EventQueueConfig)
  setDeadLetterQueue(dlq: DeadLetterQueue): void
  setOTelEventMetrics(metrics: OTelEventMetrics): void
  setPriorityStatistics(stats: PriorityStatistics): void
  getPriorityStatistics(): PriorityStatistics | undefined
  getBackpressureManager(): BackpressureManager | undefined
  getConfig(): EventQueueConfig
  getDLQ(): DeadLetterQueue | undefined
  createTaskId(): string
  /**
   * Enqueue a task into the appropriate priority queue.
   * Applies priority escalation and backpressure logic.
   */
  enqueue(task: EventTask): EnqueueResult
  /**
   * Dequeue the next task based on priority and partition ordering.
   * Priority order: CRITICAL > HIGH > NORMAL > LOW
   */
  dequeue(): EventTask | undefined
  /**
   * Re-enqueue a task for retry.
   */
  enqueueRetry(task: EventTask): void
  getDepth(): number
  getDepthByPriority(priority: 'critical' | 'high' | 'normal' | 'low'): number
  getQueueDepthByPriority(): MultiPriorityQueueDepth
  clear(): void
  syncBackpressure(): void
  private handleBackpressure
  private dropOldest
  private dequeueFromPriority
}
export type { BackpressureStrategy, EventQueueConfig, EventTask }

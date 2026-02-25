import { BackpressureManager } from './BackpressureManager'
import type { DeadLetterQueue } from './DeadLetterQueue'
import type { OTelEventMetrics } from './observability/OTelEventMetrics'
import { PriorityEscalationManager, type PriorityStatistics } from './PriorityEscalationManager'
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
  | { status: 'queued'; id: string }
  | { status: 'dropped' }
  | { status: 'delayed'; id: string; delayMs: number }

/**
 * Priority queue core: manages event task queues and backpressure.
 *
 * Handles enqueueing, dequeuing, backpressure logic, and priority escalation.
 * This class is used internally by EventPriorityQueue as a composition target.
 *
 * @internal
 */
export class QueueCore {
  criticalPriority: EventTask[] = []
  highPriority: EventTask[] = []
  normalPriority: EventTask[] = []
  lowPriority: EventTask[] = []
  processingPartitions: Set<string> = new Set()

  private taskIdCounter = 0
  private dlq?: DeadLetterQueue
  private otelEventMetrics?: OTelEventMetrics
  private backpressureManager?: BackpressureManager
  private priorityStats?: PriorityStatistics
  private config: EventQueueConfig

  constructor(config: EventQueueConfig = {}) {
    this.config = config
    if (config.backpressure?.enabled !== false && config.backpressure) {
      this.backpressureManager = new BackpressureManager(config.backpressure)
    }
  }

  setDeadLetterQueue(dlq: DeadLetterQueue): void {
    this.dlq = dlq
  }

  setOTelEventMetrics(metrics: OTelEventMetrics): void {
    this.otelEventMetrics = metrics
  }

  setPriorityStatistics(stats: PriorityStatistics): void {
    this.priorityStats = stats
  }

  getPriorityStatistics(): PriorityStatistics | undefined {
    return this.priorityStats
  }

  getBackpressureManager(): BackpressureManager | undefined {
    return this.backpressureManager
  }

  getConfig(): EventQueueConfig {
    return this.config
  }

  getDLQ(): DeadLetterQueue | undefined {
    return this.dlq
  }

  createTaskId(): string {
    return `task-${++this.taskIdCounter}-${Date.now()}`
  }

  /**
   * Enqueue a task into the appropriate priority queue.
   * Applies priority escalation and backpressure logic.
   */
  enqueue(task: EventTask): EnqueueResult {
    // === Apply priority escalation if enabled ===
    if (task.options.escalation?.enabled !== false) {
      const originalPriority = task.options.priority || 'normal'
      const escalatedPriority = PriorityEscalationManager.calculateCurrentPriority(
        task,
        task.options.escalation
      )

      if (escalatedPriority !== originalPriority) {
        this.priorityStats?.recordEscalation(originalPriority, escalatedPriority)
        this.otelEventMetrics?.recordPriorityEscalation(
          task.hook,
          originalPriority,
          escalatedPriority
        )
      }

      task.options.priority = escalatedPriority
    }

    const priority = task.options.priority || 'normal'
    this.priorityStats?.recordEvent(priority as any)

    // === Evaluate advanced backpressure if enabled ===
    if (this.backpressureManager) {
      const decision = this.backpressureManager.evaluate(
        task.hook,
        priority as 'critical' | 'high' | 'normal' | 'low',
        this.getDepth(),
        {
          critical: this.criticalPriority.length,
          high: this.highPriority.length,
          normal: this.normalPriority.length,
          low: this.lowPriority.length,
        }
      )

      if (!decision.allowed) {
        this.otelEventMetrics?.recordBackpressureRejection(
          task.hook,
          priority,
          decision.reason || 'unknown'
        )

        if (decision.isOverflow && this.config.backpressure?.dlqOnOverflow && this.dlq) {
          const overflowError = new Error(`Backpressure OVERFLOW: ${decision.reason}`)
          this.dlq.add(
            task.hook,
            task.args,
            task.options,
            overflowError,
            task.retryCount || 0,
            Date.now(),
            'backpressure_overflow'
          )
          this.otelEventMetrics?.recordDLQEntry(task.hook, 'backpressure_overflow')
        }

        if (this.config.backpressure?.rejectionPolicy === 'throw') {
          throw new Error(`[BackpressureManager] Event rejected: ${decision.reason}`)
        }
        return { status: 'dropped' }
      }

      if (decision.delayed && decision.delayMs) {
        return { status: 'delayed', id: task.id, delayMs: decision.delayMs }
      }
    }

    // === Fall back to simple backpressure (maxSize + strategy) ===
    if (this.config.maxSize && this.getDepth() >= this.config.maxSize) {
      if (!this.handleBackpressure(task.hook)) {
        return { status: 'dropped' }
      }
    }

    const finalPriority = task.options.priority || 'normal'

    switch (finalPriority) {
      case 'critical':
        this.criticalPriority.push(task)
        break
      case 'high':
        this.highPriority.push(task)
        break
      case 'normal':
        this.normalPriority.push(task)
        break
      case 'low':
        this.lowPriority.push(task)
        break
    }

    this.syncBackpressure()
    return { status: 'queued', id: task.id }
  }

  /**
   * Dequeue the next task based on priority and partition ordering.
   * Priority order: CRITICAL > HIGH > NORMAL > LOW
   */
  dequeue(): EventTask | undefined {
    return (
      this.dequeueFromPriority(this.criticalPriority) ||
      this.dequeueFromPriority(this.highPriority) ||
      this.dequeueFromPriority(this.normalPriority) ||
      this.dequeueFromPriority(this.lowPriority)
    )
  }

  /**
   * Re-enqueue a task for retry.
   */
  enqueueRetry(task: EventTask): void {
    const priority = task.options.priority || 'normal'

    switch (priority) {
      case 'high':
        this.highPriority.push(task)
        break
      case 'normal':
        this.normalPriority.push(task)
        break
      case 'low':
        this.lowPriority.push(task)
        break
    }
  }

  getDepth(): number {
    return (
      this.criticalPriority.length +
      this.highPriority.length +
      this.normalPriority.length +
      this.lowPriority.length
    )
  }

  getDepthByPriority(priority: 'critical' | 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'critical':
        return this.criticalPriority.length
      case 'high':
        return this.highPriority.length
      case 'normal':
        return this.normalPriority.length
      case 'low':
        return this.lowPriority.length
    }
  }

  getQueueDepthByPriority(): MultiPriorityQueueDepth {
    return {
      critical: this.criticalPriority.length,
      high: this.highPriority.length,
      normal: this.normalPriority.length,
      low: this.lowPriority.length,
      total: this.getDepth(),
    }
  }

  clear(): void {
    this.highPriority = []
    this.normalPriority = []
    this.lowPriority = []
  }

  syncBackpressure(): void {
    if (!this.backpressureManager) {
      return
    }
    const depths = this.getQueueDepthByPriority()
    this.backpressureManager.updateQueueDepth(depths)
  }

  private handleBackpressure(hook: string): boolean {
    const strategy = this.config.strategy || 'reject'

    switch (strategy) {
      case 'reject':
        throw new Error(
          `[EventPriorityQueue] Queue full (size: ${this.config.maxSize}). Rejected event '${hook}'.`
        )
      case 'drop-newest':
        console.warn(`[EventPriorityQueue] Queue full. Dropping new event '${hook}' (drop-newest).`)
        return false
      case 'ignore':
        return false
      case 'drop-oldest':
        this.dropOldest()
        return true
      default:
        throw new Error(
          `[EventPriorityQueue] Queue full (size: ${this.config.maxSize}). Rejected event '${hook}'.`
        )
    }
  }

  private dropOldest(): void {
    if (this.lowPriority.length > 0) {
      const dropped = this.lowPriority.shift()
      console.warn(
        `[EventPriorityQueue] Queue full. Dropped oldest LOW priority event '${dropped?.hook}'.`
      )
      return
    }
    if (this.normalPriority.length > 0) {
      const dropped = this.normalPriority.shift()
      console.warn(
        `[EventPriorityQueue] Queue full. Dropped oldest NORMAL priority event '${dropped?.hook}'.`
      )
      return
    }
    if (this.highPriority.length > 0) {
      const dropped = this.highPriority.shift()
      console.warn(
        `[EventPriorityQueue] Queue full. Dropped oldest HIGH priority event '${dropped?.hook}'.`
      )
      return
    }
    if (this.criticalPriority.length > 0) {
      const dropped = this.criticalPriority.shift()
      console.warn(
        `[EventPriorityQueue] Queue full. Dropped oldest CRITICAL priority event '${dropped?.hook}'.`
      )
      return
    }
  }

  private dequeueFromPriority(queue: EventTask[]): EventTask | undefined {
    const taskIndex = queue.findIndex((task) => {
      if (task.options.ordering !== 'partition' || !task.partitionKey) {
        return true
      }
      return !this.processingPartitions.has(task.partitionKey)
    })

    if (taskIndex === -1) {
      return undefined
    }

    return queue.splice(taskIndex, 1)[0]
  }
}

export type { BackpressureStrategy, EventQueueConfig, EventTask }

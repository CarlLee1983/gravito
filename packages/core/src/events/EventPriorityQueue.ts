import type { ActionCallback } from '../HookManager'
import type { DeadLetterQueue } from './DeadLetterQueue'
import type { EventBackend } from './EventBackend'
import type { EventOptions } from './EventOptions'
import type { BackpressureStrategy, EventQueueConfig, EventTask } from './types'

export type { EventTask, EventQueueConfig, BackpressureStrategy }

/**
 * Priority queue for event processing.
 * Events are processed based on their priority level:
 * - High priority events are processed first
 * - Normal priority events are processed second
 * - Low priority events are processed last
 *
 * @internal
 */
export class EventPriorityQueue implements EventBackend {
  private highPriority: EventTask[] = []
  private normalPriority: EventTask[] = []
  private lowPriority: EventTask[] = []
  private processing = false
  private taskIdCounter = 0
  private dlq?: DeadLetterQueue
  private config: EventQueueConfig
  private processingPartitions: Set<string> = new Set()

  constructor(config: EventQueueConfig = {}) {
    this.config = config
  }

  /**
   * Set the Dead Letter Queue for failed events.
   *
   * @param dlq - Dead Letter Queue instance
   */
  setDeadLetterQueue(dlq: DeadLetterQueue): void {
    this.dlq = dlq
  }

  /**
   * Enqueue an event task for processing.
   *
   * @param hook - Event hook name
   * @param args - Event arguments
   * @param callbacks - Callbacks to execute
   * @param options - Event options
   * @returns Task ID
   */
  /*
   * Enqueue an event task.
   */
  enqueue(task: EventTask): void
  enqueue(hook: string, args: unknown, callbacks: ActionCallback[], options: EventOptions): string
  enqueue(
    hookOrTask: string | EventTask,
    args?: unknown,
    callbacks?: ActionCallback[],
    options?: EventOptions
  ): string | void {
    let task: EventTask

    if (typeof hookOrTask !== 'string') {
      task = hookOrTask
    } else {
      const taskId = `task-${++this.taskIdCounter}-${Date.now()}`
      task = {
        id: taskId,
        hook: hookOrTask,
        args,
        options: options!,
        callbacks: callbacks!,
        createdAt: Date.now(),
        partitionKey: options?.partitionKey,
        retryCount: 0,
      }
    }

    // Check backpressure
    if (this.config.maxSize && this.getDepth() >= this.config.maxSize) {
      if (!this.handleBackpressure(task.hook)) {
        return 'dropped'
      }
    }

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

    // Start processing if not already running
    if (!this.processing) {
      this.processNext()
    }

    return task.id
  }

  /**
   * Handle backpressure when queue is full.
   * @returns True if space was made, false if event should be dropped
   */
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

  /**
   * Drop the oldest event from the queue, prioritizing low priority events.
   */
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
  }

  /**
   * Process the next task in the queue.
   * Tasks are processed in priority order: high > normal > low
   *
   * @internal
   */
  private async processNext(): Promise<void> {
    if (this.processing) {
      return
    }

    const task = this.dequeue()
    if (!task) {
      return
    }

    this.processing = true

    try {
      await this.executeTask(task)
    } catch (error) {
      console.error(`[EventPriorityQueue] Error processing task ${task.id}:`, error)
    } finally {
      this.processing = false
      // Process next task
      setImmediate(() => this.processNext())
    }
  }

  /**
   * Dequeue the next task based on priority and partition ordering.
   *
   * @returns Next task to process, or undefined if queue is empty
   * @internal
   */
  private dequeue(): EventTask | undefined {
    // Try to find a task that respects partition ordering
    return (
      this.dequeueFromPriority(this.highPriority) ||
      this.dequeueFromPriority(this.normalPriority) ||
      this.dequeueFromPriority(this.lowPriority)
    )
  }

  /**
   * Dequeue a task from a priority queue, respecting partition ordering.
   *
   * @param queue - Priority queue to dequeue from
   * @returns Next task to process, or undefined if all tasks are blocked by partition locks
   * @internal
   */
  private dequeueFromPriority(queue: EventTask[]): EventTask | undefined {
    // Find the first task that either has no partition ordering or has an available partition
    const taskIndex = queue.findIndex((task) => {
      // If no partition ordering, task can be processed
      if (task.options.ordering !== 'partition' || !task.partitionKey) {
        return true
      }

      // If partition ordering, check if partition is available (not currently processing)
      return !this.processingPartitions.has(task.partitionKey)
    })

    if (taskIndex === -1) {
      return undefined // No available task
    }

    // Remove and return the task
    return queue.splice(taskIndex, 1)[0]
  }

  /**
   * Execute an event task by running all its callbacks.
   * Implements retry logic with exponential backoff and DLQ integration.
   * Also handles partition ordering by acquiring and releasing partition locks.
   *
   * @param task - Event task to execute
   * @internal
   */
  private async executeTask(task: EventTask): Promise<void> {
    const { callbacks, args, options, hook, partitionKey } = task
    const timeout = options.timeout || 5000
    const retryConfig = options.retry || {}
    const maxRetries = retryConfig.maxRetries || 0

    // Acquire partition lock if needed
    if (options.ordering === 'partition' && partitionKey) {
      this.processingPartitions.add(partitionKey)
    }

    try {
      let lastError: Error | undefined

      for (const callback of callbacks) {
        try {
          // Execute callback with timeout
          await this.executeWithTimeout(callback, args, timeout)
        } catch (error) {
          lastError = error as Error

          console.error(`[EventPriorityQueue] Error in callback for event '${hook}':`, error)

          // Track first failure timestamp
          if (!task.firstFailedAt) {
            task.firstFailedAt = Date.now()
          }

          task.lastError = lastError
          task.retryCount = (task.retryCount || 0) + 1

          // Check if we should retry
          if (task.retryCount <= maxRetries) {
            // Calculate retry delay with exponential backoff
            const delay = this.calculateRetryDelay(
              task.retryCount,
              retryConfig.backoff || 'exponential',
              retryConfig.initialDelayMs || 1000,
              retryConfig.maxDelayMs || 30000
            )

            console.warn(
              `[EventPriorityQueue] Retrying event '${hook}' (attempt ${task.retryCount}/${maxRetries}) after ${delay}ms`
            )

            // Schedule retry
            setTimeout(() => {
              this.enqueueRetry(task)
            }, delay)

            return
          }

          // Max retries exceeded
          if (retryConfig.dlqAfterMaxRetries && this.dlq) {
            // Send to DLQ
            this.dlq.add(hook, args, options, lastError, task.retryCount, task.firstFailedAt!)

            console.error(
              `[EventPriorityQueue] Event '${hook}' sent to DLQ after ${task.retryCount} failed attempts`
            )
          } else {
            console.error(
              `[EventPriorityQueue] Event '${hook}' permanently failed after ${task.retryCount} attempts`
            )
          }

          // Don't continue with other callbacks if one fails
          break
        }
      }
    } finally {
      // Release partition lock if needed
      if (options.ordering === 'partition' && partitionKey) {
        this.processingPartitions.delete(partitionKey)
      }
    }
  }

  /**
   * Calculate retry delay based on backoff strategy.
   *
   * @param retryCount - Current retry attempt number
   * @param backoff - Backoff strategy
   * @param initialDelay - Initial delay in ms
   * @param maxDelay - Maximum delay in ms
   * @returns Delay in milliseconds
   * @internal
   */
  private calculateRetryDelay(
    retryCount: number,
    backoff: 'exponential' | 'linear',
    initialDelay: number,
    maxDelay: number
  ): number {
    let delay: number

    if (backoff === 'exponential') {
      // Exponential backoff: delay = initialDelay * 2^(retryCount - 1)
      delay = initialDelay * 2 ** (retryCount - 1)
    } else {
      // Linear backoff: delay = initialDelay * retryCount
      delay = initialDelay * retryCount
    }

    // Cap at maxDelay
    return Math.min(delay, maxDelay)
  }

  /**
   * Re-enqueue a task for retry.
   *
   * @param task - Task to retry
   * @internal
   */
  private enqueueRetry(task: EventTask): void {
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

    // Trigger processing if not already running
    if (!this.processing) {
      this.processNext()
    }
  }

  /**
   * Execute a callback with timeout.
   *
   * @param callback - Callback to execute
   * @param args - Arguments to pass to callback
   * @param timeoutMs - Timeout in milliseconds
   * @internal
   */
  private async executeWithTimeout(
    callback: ActionCallback,
    args: unknown,
    timeoutMs: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Callback timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      Promise.resolve(callback(args))
        .then(() => {
          clearTimeout(timer)
          resolve()
        })
        .catch((error) => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  /**
   * Get the current depth of the queue.
   *
   * @returns Total number of tasks in the queue
   */
  getDepth(): number {
    return this.highPriority.length + this.normalPriority.length + this.lowPriority.length
  }

  /**
   * Get the depth of a specific priority queue.
   *
   * @param priority - Priority level
   * @returns Number of tasks in the specified priority queue
   */
  getDepthByPriority(priority: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high':
        return this.highPriority.length
      case 'normal':
        return this.normalPriority.length
      case 'low':
        return this.lowPriority.length
    }
  }

  /**
   * Clear all tasks from the queue.
   */
  clear(): void {
    this.highPriority = []
    this.normalPriority = []
    this.lowPriority = []
  }
}

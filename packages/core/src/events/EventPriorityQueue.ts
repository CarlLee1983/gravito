import type { ActionCallback } from '../HookManager'
import type { DeadLetterQueue } from './DeadLetterQueue'
import type { EventOptions } from './EventOptions'

/**
 * Event task for priority queue processing.
 * @internal
 */
export interface EventTask {
  /**
   * Unique identifier for this event task.
   */
  id: string

  /**
   * Event hook name.
   */
  hook: string

  /**
   * Event payload/arguments.
   */
  args: unknown

  /**
   * Event options.
   */
  options: EventOptions

  /**
   * Callbacks to execute for this event.
   */
  callbacks: ActionCallback[]

  /**
   * Timestamp when the event was created.
   */
  createdAt: number

  /**
   * Partition key for ordering (if applicable).
   */
  partitionKey?: string

  /**
   * Number of retry attempts made.
   * @internal
   */
  retryCount?: number

  /**
   * Timestamp when the event first failed.
   * @internal
   */
  firstFailedAt?: number

  /**
   * Last error encountered.
   * @internal
   */
  lastError?: Error
}

/**
 * Backpressure strategy for event queue overflow.
 */
export type BackpressureStrategy = 'drop-oldest' | 'drop-newest' | 'reject' | 'ignore'

/**
 * Configuration for event priority queue.
 */
export interface EventQueueConfig {
  /**
   * Maximum number of events allowed in the queue.
   * If 0 or undefined, queue is unbounded.
   */
  maxSize?: number

  /**
   * Strategy to handle new events when queue is full.
   * @default 'reject'
   */
  strategy?: BackpressureStrategy
}

/**
 * Priority queue for event processing.
 * Events are processed based on their priority level:
 * - High priority events are processed first
 * - Normal priority events are processed second
 * - Low priority events are processed last
 *
 * @internal
 */
export class EventPriorityQueue {
  private highPriority: EventTask[] = []
  private normalPriority: EventTask[] = []
  private lowPriority: EventTask[] = []
  private processing = false
  private taskIdCounter = 0
  private dlq?: DeadLetterQueue
  private config: EventQueueConfig

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
  enqueue(hook: string, args: unknown, callbacks: ActionCallback[], options: EventOptions): string {
    const taskId = `task-${++this.taskIdCounter}-${Date.now()}`

    // Check backpressure
    if (this.config.maxSize && this.getDepth() >= this.config.maxSize) {
      if (!this.handleBackpressure(hook)) {
        return 'dropped'
      }
    }

    const task: EventTask = {
      id: taskId,
      hook,
      args,
      options,
      callbacks,
      createdAt: Date.now(),
      partitionKey: options.partitionKey,
      retryCount: 0,
    }

    const priority = options.priority || 'normal'

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

    return taskId
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
   * Dequeue the next task based on priority.
   *
   * @returns Next task to process, or undefined if queue is empty
   * @internal
   */
  private dequeue(): EventTask | undefined {
    // High priority first
    if (this.highPriority.length > 0) {
      return this.highPriority.shift()
    }

    // Normal priority second
    if (this.normalPriority.length > 0) {
      return this.normalPriority.shift()
    }

    // Low priority last
    if (this.lowPriority.length > 0) {
      return this.lowPriority.shift()
    }

    return undefined
  }

  /**
   * Execute an event task by running all its callbacks.
   * Implements retry logic with exponential backoff and DLQ integration.
   *
   * @param task - Event task to execute
   * @internal
   */
  private async executeTask(task: EventTask): Promise<void> {
    const { callbacks, args, options, hook } = task
    const timeout = options.timeout || 5000
    const retryConfig = options.retry || {}
    const maxRetries = retryConfig.maxRetries || 0

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

import type { ActionCallback } from '../HookManager'
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

    const task: EventTask = {
      id: taskId,
      hook,
      args,
      options,
      callbacks,
      createdAt: Date.now(),
      partitionKey: options.partitionKey,
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
   *
   * @param task - Event task to execute
   * @internal
   */
  private async executeTask(task: EventTask): Promise<void> {
    const { callbacks, args, options } = task
    const timeout = options.timeout || 5000

    for (const callback of callbacks) {
      try {
        // Execute callback with timeout
        await this.executeWithTimeout(callback, args, timeout)
      } catch (error) {
        console.error(`[EventPriorityQueue] Error in callback for event '${task.hook}':`, error)
        // Continue with next callback even if one fails
      }
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

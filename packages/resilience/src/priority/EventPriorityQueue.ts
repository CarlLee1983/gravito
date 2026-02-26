import type {
  ActionCallback,
  BackpressureStrategy,
  EventBackend,
  EventOptions,
  EventQueueConfig,
  EventTask,
  MultiPriorityQueueDepth,
} from '@gravito/core'
import type { Span } from '@opentelemetry/api'
import { BackpressureManager } from '../backpressure/BackpressureManager'
import { CircuitBreaker } from '../circuit-breaker/CircuitBreaker'
import type { DeadLetterQueue } from '../dead-letter-queue/DeadLetterQueue'
import type { EventMetrics } from '../observability/EventMetrics'
import type { EventTracing } from '../observability/EventTracing'
import type { OTelEventMetrics } from '../observability/OTelEventMetrics'
import type { RetryScheduler } from '../retry/RetryScheduler'
import type { WorkerPool } from '../worker/WorkerPool'
import { PriorityEscalationManager, type PriorityStatistics } from './PriorityEscalationManager'

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
 * @internal
 */
export class EventPriorityQueue implements EventBackend {
  private criticalPriority: EventTask[] = []
  private highPriority: EventTask[] = []
  private normalPriority: EventTask[] = []
  private lowPriority: EventTask[] = []
  private processing = false
  private taskIdCounter = 0
  private dlq?: DeadLetterQueue
  private persistentDLQHandler?: (
    hook: string,
    args: unknown,
    options: EventOptions,
    error: Error,
    retryCount: number,
    firstFailedAt: number
  ) => Promise<void>
  private config: EventQueueConfig
  private processingPartitions: Set<string> = new Set()
  private eventCircuitBreakers: Map<string, CircuitBreaker> = new Map()
  private eventMetrics?: EventMetrics
  private otelEventMetrics?: OTelEventMetrics
  private eventTracing?: EventTracing
  private currentDispatchSpan?: Span
  private backpressureManager?: BackpressureManager
  private workerPool?: WorkerPool
  private retryScheduler?: RetryScheduler
  private priorityStats?: PriorityStatistics

  constructor(config: EventQueueConfig = {}) {
    this.config = config
    // Initialize BackpressureManager if configured
    if (config.backpressure?.enabled !== false && config.backpressure) {
      this.backpressureManager = new BackpressureManager(config.backpressure)
    }
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
   * Set the persistent DLQ handler for failed events.
   *
   * @param handler - Async handler function for persistent DLQ
   */
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
    this.persistentDLQHandler = handler
  }

  /**
   * Set the EventMetrics instance for recording circuit breaker metrics.
   *
   * @param metrics - EventMetrics instance
   * @internal
   */
  setEventMetrics(metrics: EventMetrics): void {
    this.eventMetrics = metrics
  }

  /**
   * Set the OTelEventMetrics instance for recording DLQ and backpressure metrics.
   *
   * @param metrics - OTelEventMetrics instance
   * @internal
   */
  setOTelEventMetrics(metrics: OTelEventMetrics): void {
    this.otelEventMetrics = metrics
  }

  /**
   * Set the PriorityStatistics instance for tracking priority distribution.
   *
   * @param stats - PriorityStatistics instance
   * @internal
   */
  setPriorityStatistics(stats: PriorityStatistics): void {
    this.priorityStats = stats
  }

  /**
   * Get the PriorityStatistics instance.
   *
   * @returns PriorityStatistics instance or undefined
   * @internal
   */
  getPriorityStatistics(): PriorityStatistics | undefined {
    return this.priorityStats
  }

  /**
   * Set the EventTracing instance for distributed tracing.
   *
   * @param tracing - EventTracing instance
   * @internal
   */
  setEventTracing(tracing: EventTracing): void {
    this.eventTracing = tracing
  }

  /**
   * Set the current dispatch span for creating child spans.
   *
   * @param span - Parent dispatch span
   * @internal
   */
  setCurrentDispatchSpan(span: Span | undefined): void {
    this.currentDispatchSpan = span
  }

  /**
   * Get the current dispatch span.
   *
   * @returns Current dispatch span or undefined
   * @internal
   */
  getCurrentDispatchSpan(): Span | undefined {
    return this.currentDispatchSpan
  }

  /**
   * Set the RetryScheduler for async distributed retries.
   *
   * @param scheduler - RetryScheduler instance
   * @internal
   */
  setRetryScheduler(scheduler: RetryScheduler): void {
    this.retryScheduler = scheduler
  }

  /**
   * Get the RetryScheduler instance.
   *
   * @returns RetryScheduler instance or undefined
   * @internal
   */
  getRetryScheduler(): RetryScheduler | undefined {
    return this.retryScheduler
  }

  /**
   * Get or create a circuit breaker for an event hook.
   *
   * @param hook - Event hook name
   * @param config - Circuit breaker configuration
   * @returns Circuit breaker instance or undefined if not configured
   * @internal
   */
  private getOrCreateEventCircuitBreaker(
    hook: string,
    config?: EventOptions['circuitBreaker']
  ): CircuitBreaker | undefined {
    // Return undefined if circuit breaker is not configured
    if (!config) {
      return undefined
    }

    // Return existing breaker if available
    if (this.eventCircuitBreakers.has(hook)) {
      return this.eventCircuitBreakers.get(hook)!
    }

    // Create new circuit breaker for this event
    const breaker = new CircuitBreaker(hook, {
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
      halfOpenRequests: config.halfOpenRequests,
      onOpen: () => {
        console.warn(`[EventPriorityQueue] Circuit breaker opened for event '${hook}'`)
      },
      onHalfOpen: () => {
        console.info(`[EventPriorityQueue] Circuit breaker half-open for event '${hook}'`)
      },
      onClose: () => {
        console.info(`[EventPriorityQueue] Circuit breaker closed for event '${hook}'`)
      },
      metricsRecorder: this.eventMetrics
        ? {
            recordState: (name: string, state: number) =>
              this.eventMetrics?.recordCircuitBreakerState(name, state),
            recordTransition: (name: string, from: string, to: string) =>
              this.eventMetrics?.recordCircuitBreakerTransition(name, from, to),
            recordFailure: (name: string) => this.eventMetrics?.recordCircuitBreakerFailure(name),
            recordSuccess: (name: string) => this.eventMetrics?.recordCircuitBreakerSuccess(name),
            recordOpenDuration: (name: string, seconds: number) =>
              this.eventMetrics?.recordCircuitBreakerOpenDuration(name, seconds),
          }
        : undefined,
    })

    this.eventCircuitBreakers.set(hook, breaker)
    return breaker
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
      const taskId = `task-${++this.taskIdCounter}-${Date.now()}`
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

    // === Apply priority escalation if enabled ===
    if (task.options.escalation?.enabled !== false) {
      const originalPriority = task.options.priority || 'normal'
      const escalatedPriority = PriorityEscalationManager.calculateCurrentPriority(
        task,
        task.options.escalation
      )

      // Record escalation event if priority changed
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

    // Record event priority stat
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
        // Record backpressure rejection metric
        const priority = task.options.priority || 'normal'
        this.otelEventMetrics?.recordBackpressureRejection(
          task.hook,
          priority,
          decision.reason || 'unknown'
        )

        // Handle OVERFLOW: route to DLQ if configured
        if (decision.isOverflow && this.config.backpressure?.dlqOnOverflow && this.dlq) {
          // Create a synthetic error for DLQ entry
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
          // Record DLQ entry metric
          this.otelEventMetrics?.recordDLQEntry(task.hook, 'backpressure_overflow')
        }

        // Rejection: handle according to policy (throw/drop-silent/drop-with-callback)
        if (this.config.backpressure?.rejectionPolicy === 'throw') {
          throw new Error(`[BackpressureManager] Event rejected: ${decision.reason}`)
        }
        return 'dropped'
      }

      if (decision.delayed && decision.delayMs) {
        // Delayed enqueue: schedule re-enqueue after delay
        setTimeout(() => {
          this.enqueue(task)
        }, decision.delayMs)
        return task.id
      }
    }

    // === Fall back to simple backpressure (maxSize + strategy) ===
    if (this.config.maxSize && this.getDepth() >= this.config.maxSize) {
      if (!this.handleBackpressure(task.hook)) {
        return 'dropped'
      }
    }

    const finalPriority = task.options.priority || 'normal'

    switch (finalPriority) {
      case 'critical':
        this.criticalPriority.push(task)
        // Process immediately for CRITICAL events
        if (!this.processing) {
          setImmediate(() => this.processNext())
        }
        break
      case 'high':
        this.highPriority.push(task)
        if (!this.processing) {
          this.processNext()
        }
        break
      case 'normal':
        this.normalPriority.push(task)
        if (!this.processing) {
          this.processNext()
        }
        break
      case 'low':
        this.lowPriority.push(task)
        if (!this.processing) {
          this.processNext()
        }
        break
    }

    // === FS-103: Sync queue depth to backpressure manager ===
    this.syncBackpressure()

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
   * Drops in order: LOW → NORMAL → HIGH → CRITICAL
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
    if (this.criticalPriority.length > 0) {
      const dropped = this.criticalPriority.shift()
      console.warn(
        `[EventPriorityQueue] Queue full. Dropped oldest CRITICAL priority event '${dropped?.hook}'.`
      )
      return
    }
  }

  /**
   * Process the next task in the queue.
   * Tasks are processed in priority order: high > normal > low
   * If WorkerPool is configured, tasks are submitted to the pool for concurrent execution.
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
      // If WorkerPool is configured, submit task to pool
      if (this.workerPool) {
        await this.workerPool.submitTask(task)
      } else {
        // Otherwise, execute task directly (original behavior)
        await this.executeTask(task)
      }
    } catch (error) {
      console.error(`[EventPriorityQueue] Error processing task ${task.id}:`, error)
    } finally {
      this.processing = false
      // === FS-103: Sync queue depth after processing ===
      this.syncBackpressure()
      // Process next task
      setImmediate(() => this.processNext())
    }
  }

  /**
   * Dequeue the next task based on priority and partition ordering.
   * Priority order: CRITICAL > HIGH > NORMAL > LOW
   *
   * @returns Next task to process, or undefined if queue is empty
   * @internal
   */
  private dequeue(): EventTask | undefined {
    // Try to find a task that respects partition ordering
    return (
      this.dequeueFromPriority(this.criticalPriority) ||
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
   * Implements circuit breaker protection, retry logic with exponential backoff, and DLQ integration.
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
    const circuitBreakerConfig = options.circuitBreaker

    // Get or create circuit breaker for this event
    const circuitBreaker = this.getOrCreateEventCircuitBreaker(hook, circuitBreakerConfig)

    // Acquire partition lock if needed
    if (options.ordering === 'partition' && partitionKey) {
      this.processingPartitions.add(partitionKey)
    }

    try {
      let lastError: Error | undefined
      let listenerIndex = 0

      for (const callback of callbacks) {
        // Create listener span if tracing is enabled
        let listenerSpan: Span | undefined
        const listenerStartTime = performance.now()

        if (this.eventTracing && this.currentDispatchSpan) {
          const listenerName = callback.name || `listener_${listenerIndex}`
          listenerSpan = this.eventTracing.startListenerSpan(
            this.currentDispatchSpan,
            hook,
            listenerName,
            listenerIndex
          )
        }

        try {
          // Execute callback with circuit breaker protection and timeout
          if (circuitBreaker) {
            await circuitBreaker.execute(async () => {
              return await this.executeWithTimeout(callback, args, timeout)
            })
          } else {
            // No circuit breaker, execute directly
            await this.executeWithTimeout(callback, args, timeout)
          }

          // End listener span with success
          if (listenerSpan && this.eventTracing) {
            const duration = performance.now() - listenerStartTime
            this.eventTracing.endListenerSpan(listenerSpan, 'ok', duration)
          }
        } catch (error) {
          // Record error in listener span
          if (listenerSpan && this.eventTracing) {
            const duration = performance.now() - listenerStartTime
            this.eventTracing.endListenerSpan(listenerSpan, 'error', duration, error as Error)
          }
          lastError = error as Error

          // Check if error is from circuit breaker being open
          const isCircuitBreakerOpen = lastError.message.includes('Circuit is OPEN')

          if (isCircuitBreakerOpen) {
            console.warn(
              `[EventPriorityQueue] Circuit breaker is open for event '${hook}'. Rejecting event.`
            )

            // If circuit breaker is open, check if we should send to DLQ
            // By default, we reject the event (don't retry, don't DLQ)
            // User can configure dlqAfterMaxRetries to allow DLQ routing
            if (retryConfig.dlqAfterMaxRetries) {
              if (!task.firstFailedAt) {
                task.firstFailedAt = Date.now()
              }

              // Send to in-memory DLQ
              if (this.dlq) {
                this.dlq.add(
                  hook,
                  args,
                  options,
                  lastError,
                  task.retryCount || 0,
                  task.firstFailedAt!,
                  'circuit_breaker'
                )
                // Record DLQ entry metric
                this.otelEventMetrics?.recordDLQEntry(hook, 'circuit_breaker')
              }

              // Send to persistent DLQ if handler is provided
              if (this.persistentDLQHandler) {
                try {
                  await this.persistentDLQHandler(
                    hook,
                    args,
                    options,
                    lastError,
                    task.retryCount || 0,
                    task.firstFailedAt!
                  )
                } catch (dlqHandlerError) {
                  console.error(
                    `[EventPriorityQueue] Error handling persistent DLQ:`,
                    dlqHandlerError
                  )
                }
              }

              console.error(
                `[EventPriorityQueue] Event '${hook}' sent to DLQ due to circuit breaker`
              )
            }

            // Don't continue with other callbacks if circuit breaker is open
            break
          }

          console.error(`[EventPriorityQueue] Error in callback for event '${hook}':`, error)

          // Track first failure timestamp
          if (!task.firstFailedAt) {
            task.firstFailedAt = Date.now()
          }

          task.lastError = lastError
          task.retryCount = (task.retryCount || 0) + 1

          // Record retry attempt metric
          this.otelEventMetrics?.recordRetryAttempt(hook, task.retryCount)

          // Check if we should retry
          if (task.retryCount <= maxRetries) {
            console.warn(
              `[EventPriorityQueue] Retrying event '${hook}' (attempt ${task.retryCount}/${maxRetries})`
            )

            // Try to use RetryScheduler if enabled
            if (this.retryScheduler?.isEnabled()) {
              try {
                await this.retryScheduler.scheduleRetry(
                  hook,
                  args,
                  options,
                  lastError,
                  task.retryCount
                )
                return
              } catch (schedulerError) {
                // Fallback to setTimeout if Bull Queue fails
                console.warn(
                  '[EventPriorityQueue] RetryScheduler failed, falling back to setTimeout:',
                  schedulerError instanceof Error ? schedulerError.message : String(schedulerError)
                )
              }
            }

            // Fallback: Calculate retry delay and use setTimeout
            const delay = this.calculateRetryDelay(
              task.retryCount,
              retryConfig.backoff || 'exponential',
              retryConfig.initialDelayMs || 1000,
              retryConfig.maxDelayMs || 30000
            )

            // Schedule retry with setTimeout
            setTimeout(() => {
              this.enqueueRetry(task)
            }, delay)

            return
          }

          // Max retries exceeded
          if (retryConfig.dlqAfterMaxRetries) {
            // Send to in-memory DLQ
            if (this.dlq) {
              this.dlq.add(
                hook,
                args,
                options,
                lastError,
                task.retryCount,
                task.firstFailedAt!,
                'retry_exhausted'
              )
              // Record DLQ entry metric
              this.otelEventMetrics?.recordDLQEntry(hook, 'retry_exhausted')
            }

            // Send to persistent DLQ if handler is provided
            if (this.persistentDLQHandler) {
              try {
                await this.persistentDLQHandler(
                  hook,
                  args,
                  options,
                  lastError,
                  task.retryCount,
                  task.firstFailedAt!
                )
              } catch (dlqHandlerError) {
                console.error(
                  `[EventPriorityQueue] Error handling persistent DLQ:`,
                  dlqHandlerError
                )
              }
            }

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

        // Increment listener index for next iteration
        listenerIndex++
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
    return (
      this.criticalPriority.length +
      this.highPriority.length +
      this.normalPriority.length +
      this.lowPriority.length
    )
  }

  /**
   * Get the depth of a specific priority queue.
   *
   * @param priority - Priority level
   * @returns Number of tasks in the specified priority queue
   */
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

  /**
   * Get the BackpressureManager instance if enabled.
   *
   * @returns BackpressureManager instance or undefined if not enabled
   * @internal
   */
  getBackpressureManager(): BackpressureManager | undefined {
    return this.backpressureManager
  }

  /**
   * Set the WorkerPool for concurrent task execution.
   *
   * @param pool - WorkerPool instance
   * @internal
   */
  setWorkerPool(pool: WorkerPool): void {
    this.workerPool = pool
  }

  /**
   * Get the WorkerPool instance if set.
   *
   * @returns WorkerPool instance or undefined if not set
   * @internal
   */
  getWorkerPool(): WorkerPool | undefined {
    return this.workerPool
  }

  /**
   * Clear all tasks from the queue.
   */
  clear(): void {
    this.criticalPriority = []
    this.highPriority = []
    this.normalPriority = []
    this.lowPriority = []
  }

  /**
   * Get circuit breaker for an event hook.
   *
   * @param hook - Event hook name
   * @returns Circuit breaker instance or undefined
   * @internal
   */
  getCircuitBreaker(hook: string) {
    return this.eventCircuitBreakers.get(hook)
  }

  /**
   * Get all circuit breakers.
   *
   * @returns Map of circuit breakers keyed by hook name
   * @internal
   */
  getCircuitBreakers() {
    return this.eventCircuitBreakers
  }

  /**
   * Reset a circuit breaker for an event hook.
   *
   * @param hook - Event hook name
   * @returns True if reset, false if circuit breaker not found
   * @internal
   */
  resetCircuitBreaker(hook: string): boolean {
    const breaker = this.eventCircuitBreakers.get(hook)
    if (!breaker) {
      return false
    }

    breaker.reset()
    return true
  }

  /**
   * Batch enqueue multiple tasks (FS-102).
   * Supports aggregation layer batch submission.
   *
   * @param tasks - Array of tasks to enqueue
   * @returns Array of task IDs
   * @internal
   */
  enqueueBatch(tasks: EventTask[]): string[] {
    const taskIds: string[] = []

    for (const task of tasks) {
      const id = this.enqueue(task)
      taskIds.push(id)
    }

    // Trigger batch processing if not already processing
    if (tasks.length > 0 && !this.processing) {
      setImmediate(() => this.processNext())
    }

    return taskIds
  }

  /**
   * Get queue depth for each priority level (FS-103).
   * Used by BackpressureManager for multi-priority depth monitoring.
   *
   * @returns Queue depth snapshot with depths for each priority
   * @internal
   */
  getQueueDepthByPriority(): MultiPriorityQueueDepth {
    return {
      critical: this.criticalPriority.length,
      high: this.highPriority.length,
      normal: this.normalPriority.length,
      low: this.lowPriority.length,
      total: this.getDepth(),
    }
  }

  /**
   * Sync queue depth to BackpressureManager (FS-103).
   * Called whenever queue depth changes to keep BackpressureManager
   * synchronized with real-time queue state.
   *
   * @private
   * @internal
   */
  private syncBackpressure(): void {
    if (!this.backpressureManager) {
      return
    }

    const depths = this.getQueueDepthByPriority()
    this.backpressureManager.updateQueueDepth(depths)
  }
}

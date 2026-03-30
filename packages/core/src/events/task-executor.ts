import type { Span } from '@opentelemetry/api'
import type { ActionCallback } from '../HookManager'
import { CircuitBreaker } from './CircuitBreaker'
import type { DeadLetterQueue, DLQEntrySource } from './DeadLetterQueue'
import type { EventOptions } from './EventOptions'
import type { EventMetrics } from './observability/EventMetrics'
import type { EventTracing } from './observability/EventTracing'
import type { OTelEventMetrics } from './observability/OTelEventMetrics'
import type { RetryScheduler } from './RetryScheduler'
import type { EventTask } from './types'

/**
 * Executes event tasks with circuit breaker protection, retry logic,
 * exponential backoff, DLQ integration, and distributed tracing.
 *
 * @internal
 */
export class TaskExecutor {
  private eventCircuitBreakers: Map<string, CircuitBreaker> = new Map()
  private eventMetrics?: EventMetrics
  private otelEventMetrics?: OTelEventMetrics
  private eventTracing?: EventTracing
  private currentDispatchSpan?: Span
  private retryScheduler?: RetryScheduler

  private dlq?: DeadLetterQueue
  private persistentDLQHandler?: (
    hook: string,
    args: unknown,
    options: EventOptions,
    error: Error,
    retryCount: number,
    firstFailedAt: number
  ) => Promise<void>

  private enqueueRetryFn?: (task: EventTask) => void

  setDeadLetterQueue(dlq: DeadLetterQueue): void {
    this.dlq = dlq
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
    this.persistentDLQHandler = handler
  }

  setEventMetrics(metrics: EventMetrics): void {
    this.eventMetrics = metrics
  }

  setOTelEventMetrics(metrics: OTelEventMetrics): void {
    this.otelEventMetrics = metrics
  }

  setEventTracing(tracing: EventTracing): void {
    this.eventTracing = tracing
  }

  setCurrentDispatchSpan(span: Span | undefined): void {
    this.currentDispatchSpan = span
  }

  getCurrentDispatchSpan(): Span | undefined {
    return this.currentDispatchSpan
  }

  setRetryScheduler(scheduler: RetryScheduler): void {
    this.retryScheduler = scheduler
  }

  getRetryScheduler(): RetryScheduler | undefined {
    return this.retryScheduler
  }

  /**
   * Set the callback to use when re-enqueueing a task after a retry delay.
   */
  setEnqueueRetryFn(fn: (task: EventTask) => void): void {
    this.enqueueRetryFn = fn
  }

  getCircuitBreaker(hook: string) {
    return this.eventCircuitBreakers.get(hook)
  }

  getCircuitBreakers() {
    return this.eventCircuitBreakers
  }

  resetCircuitBreaker(hook: string): boolean {
    const breaker = this.eventCircuitBreakers.get(hook)
    if (!breaker) {
      return false
    }
    breaker.reset()
    return true
  }

  /**
   * Execute an event task by running all its callbacks.
   * Implements circuit breaker protection, retry logic, and DLQ integration.
   */
  async executeTask(task: EventTask, processingPartitions: Set<string>): Promise<void> {
    const { callbacks, args, options, hook, partitionKey } = task
    const timeout = options.timeout || 5000
    const retryConfig = options.retry || {}
    const maxRetries = retryConfig.maxRetries || 0
    const circuitBreakerConfig = options.circuitBreaker

    const circuitBreaker = this.getOrCreateEventCircuitBreaker(hook, circuitBreakerConfig)

    if (options.ordering === 'partition' && partitionKey) {
      processingPartitions.add(partitionKey)
    }

    try {
      let lastError: Error | undefined
      let listenerIndex = 0

      for (const callback of callbacks) {
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
          if (circuitBreaker) {
            await circuitBreaker.execute(async () => {
              return await this.executeWithTimeout(callback, args, timeout)
            })
          } else {
            await this.executeWithTimeout(callback, args, timeout)
          }

          if (listenerSpan && this.eventTracing) {
            const duration = performance.now() - listenerStartTime
            this.eventTracing.endListenerSpan(listenerSpan, 'ok', duration)
          }
        } catch (error) {
          if (listenerSpan && this.eventTracing) {
            const duration = performance.now() - listenerStartTime
            this.eventTracing.endListenerSpan(listenerSpan, 'error', duration, error as Error)
          }
          lastError = error as Error

          const isCircuitBreakerOpen = lastError.message.includes('Circuit is OPEN')

          if (isCircuitBreakerOpen) {
            // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
            console.warn(
              `[EventPriorityQueue] Circuit breaker is open for event '${hook}'. Rejecting event.`
            )

            if (retryConfig.dlqAfterMaxRetries) {
              if (!task.firstFailedAt) {
                task.firstFailedAt = Date.now()
              }

              await this.sendToDLQ(
                hook,
                args,
                options,
                lastError,
                task.retryCount || 0,
                task.firstFailedAt!,
                'circuit_breaker'
              )

              // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
              console.error(
                `[EventPriorityQueue] Event '${hook}' sent to DLQ due to circuit breaker`
              )
            }

            break
          }

          // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
          console.error(`[EventPriorityQueue] Error in callback for event '${hook}':`, error)

          if (!task.firstFailedAt) {
            task.firstFailedAt = Date.now()
          }

          task.lastError = lastError
          task.retryCount = (task.retryCount || 0) + 1

          this.otelEventMetrics?.recordRetryAttempt(hook, task.retryCount)

          if (task.retryCount <= maxRetries) {
            // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
            console.warn(
              `[EventPriorityQueue] Retrying event '${hook}' (attempt ${task.retryCount}/${maxRetries})`
            )

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
                // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
                console.warn(
                  '[EventPriorityQueue] RetryScheduler failed, falling back to setTimeout:',
                  schedulerError instanceof Error ? schedulerError.message : String(schedulerError)
                )
              }
            }

            const delay = this.calculateRetryDelay(
              task.retryCount,
              retryConfig.backoff || 'exponential',
              retryConfig.initialDelayMs || 1000,
              retryConfig.maxDelayMs || 30000
            )

            setTimeout(() => {
              this.enqueueRetryFn?.(task)
            }, delay)

            return
          }

          if (retryConfig.dlqAfterMaxRetries) {
            await this.sendToDLQ(
              hook,
              args,
              options,
              lastError,
              task.retryCount,
              task.firstFailedAt!,
              'retry_exhausted'
            )

            // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
            console.error(
              `[EventPriorityQueue] Event '${hook}' sent to DLQ after ${task.retryCount} failed attempts`
            )
          } else {
            // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
            console.error(
              `[EventPriorityQueue] Event '${hook}' permanently failed after ${task.retryCount} attempts`
            )
          }

          break
        }

        listenerIndex++
      }
    } finally {
      if (options.ordering === 'partition' && partitionKey) {
        processingPartitions.delete(partitionKey)
      }
    }
  }

  private async sendToDLQ(
    hook: string,
    args: unknown,
    options: EventOptions,
    error: Error,
    retryCount: number,
    firstFailedAt: number,
    reason: DLQEntrySource
  ): Promise<void> {
    if (this.dlq) {
      this.dlq.add(hook, args, options, error, retryCount, firstFailedAt, reason)
      this.otelEventMetrics?.recordDLQEntry(hook, reason as string)
    }

    if (this.persistentDLQHandler) {
      try {
        await this.persistentDLQHandler(hook, args, options, error, retryCount, firstFailedAt)
      } catch (dlqHandlerError) {
        // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
        console.error(`[EventPriorityQueue] Error handling persistent DLQ:`, dlqHandlerError)
      }
    }
  }

  private getOrCreateEventCircuitBreaker(
    hook: string,
    config?: EventOptions['circuitBreaker']
  ): CircuitBreaker | undefined {
    if (!config) {
      return undefined
    }

    if (this.eventCircuitBreakers.has(hook)) {
      return this.eventCircuitBreakers.get(hook)!
    }

    const breaker = new CircuitBreaker(hook, {
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
      halfOpenRequests: config.halfOpenRequests,
      onOpen: () => {
        // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
        console.warn(`[EventPriorityQueue] Circuit breaker opened for event '${hook}'`)
      },
      onHalfOpen: () => {
        // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
        console.info(`[EventPriorityQueue] Circuit breaker half-open for event '${hook}'`)
      },
      onClose: () => {
        // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
        console.info(`[EventPriorityQueue] Circuit breaker closed for event '${hook}'`)
      },
      metricsRecorder: this.eventMetrics
        ? {
            recordState: (name, state) => this.eventMetrics?.recordCircuitBreakerState(name, state),
            recordTransition: (name, from, to) =>
              this.eventMetrics?.recordCircuitBreakerTransition(name, from, to),
            recordFailure: (name) => this.eventMetrics?.recordCircuitBreakerFailure(name),
            recordSuccess: (name) => this.eventMetrics?.recordCircuitBreakerSuccess(name),
            recordOpenDuration: (name, seconds) =>
              this.eventMetrics?.recordCircuitBreakerOpenDuration(name, seconds),
          }
        : undefined,
    })

    this.eventCircuitBreakers.set(hook, breaker)
    return breaker
  }

  private calculateRetryDelay(
    retryCount: number,
    backoff: 'exponential' | 'linear',
    initialDelay: number,
    maxDelay: number
  ): number {
    let delay: number

    if (backoff === 'exponential') {
      delay = initialDelay * 2 ** (retryCount - 1)
    } else {
      delay = initialDelay * retryCount
    }

    return Math.min(delay, maxDelay)
  }

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
}

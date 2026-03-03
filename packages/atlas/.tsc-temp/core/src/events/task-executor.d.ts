import type { Span } from '@opentelemetry/api'
import { CircuitBreaker } from './CircuitBreaker'
import type { DeadLetterQueue } from './DeadLetterQueue'
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
export declare class TaskExecutor {
  private eventCircuitBreakers
  private eventMetrics?
  private otelEventMetrics?
  private eventTracing?
  private currentDispatchSpan?
  private retryScheduler?
  private dlq?
  private persistentDLQHandler?
  private enqueueRetryFn?
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
  setEventTracing(tracing: EventTracing): void
  setCurrentDispatchSpan(span: Span | undefined): void
  getCurrentDispatchSpan(): Span | undefined
  setRetryScheduler(scheduler: RetryScheduler): void
  getRetryScheduler(): RetryScheduler | undefined
  /**
   * Set the callback to use when re-enqueueing a task after a retry delay.
   */
  setEnqueueRetryFn(fn: (task: EventTask) => void): void
  getCircuitBreaker(hook: string): CircuitBreaker
  getCircuitBreakers(): Map<string, CircuitBreaker>
  resetCircuitBreaker(hook: string): boolean
  /**
   * Execute an event task by running all its callbacks.
   * Implements circuit breaker protection, retry logic, and DLQ integration.
   */
  executeTask(task: EventTask, processingPartitions: Set<string>): Promise<void>
  private sendToDLQ
  private getOrCreateEventCircuitBreaker
  private calculateRetryDelay
  private executeWithTimeout
}

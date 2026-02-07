import type { EventBackend, EventTask } from '@gravito/core'
import type { QueueManager } from './QueueManager'
import { SystemEventJob } from './SystemEventJob'
import type { JobPushOptions } from './types'

/**
 * Retry strategy for events.
 *
 * - 'bull': Use Bull Queue's built-in retry mechanism
 * - 'core': Use EventPriorityQueue's retry logic (not implemented in Stream backend)
 * - 'hybrid': Bull retries + Core DLQ fallback (future phase)
 */
export type RetryStrategy = 'bull' | 'core' | 'hybrid'

/**
 * Configuration for StreamEventBackend.
 */
export interface StreamEventBackendConfig {
  /**
   * Retry strategy to use.
   * @default 'bull'
   */
  retryStrategy?: RetryStrategy

  /**
   * Whether to integrate with CircuitBreaker.
   * @default false
   */
  circuitBreakerIntegration?: boolean

  /**
   * Optional DLQ (Dead Letter Queue) handler for failed events.
   */
  dlqHandler?: {
    handle(event: EventTask, error: Error, attempt: number): Promise<void>
  }

  /**
   * CircuitBreaker getter (injected from core)
   */
  getCircuitBreaker?: (hook: string) => any
}

/**
 * Event backend implementation using Gravito Stream (Bull Queue).
 *
 * Provides persistent, distributed event processing with:
 * - Bull Queue persistence (Redis-backed)
 * - Configurable retry strategies
 * - Optional CircuitBreaker integration
 * - DLQ support for failed events
 *
 * @example
 * ```typescript
 * const queueManager = new QueueManager({
 *   default: 'bullmq',
 *   connections: {
 *     bullmq: {
 *       driver: 'bullmq',
 *       queue: new Queue('gravito-events', { connection: redis })
 *     }
 *   }
 * })
 *
 * const backend = new StreamEventBackend(queueManager, {
 *   retryStrategy: 'bull',
 *   circuitBreakerIntegration: true
 * })
 * ```
 */
export class StreamEventBackend implements EventBackend {
  private config: StreamEventBackendConfig

  constructor(
    private queueManager: QueueManager,
    config?: StreamEventBackendConfig
  ) {
    this.config = {
      retryStrategy: 'bull',
      circuitBreakerIntegration: false,
      ...config,
    }
  }

  /**
   * Build Job Push Options from EventOptions.
   *
   * Maps EventOptions to Bull Queue JobPushOptions with retry strategy applied.
   */
  private buildJobOptions(task: EventTask): JobPushOptions {
    const options: JobPushOptions = {}

    // Map priority if present
    if (task.options?.priority) {
      options.priority = task.options.priority
    }

    // Map group ID for FIFO processing (if provided in options as any)
    const taskOptionsAny = task.options as any
    if (taskOptionsAny?.groupId) {
      options.groupId = taskOptionsAny.groupId
    }

    return options
  }

  /**
   * Enqueue an event task to the stream queue.
   *
   * Applies retry strategy and CircuitBreaker checks based on configuration.
   * Supports DLQ routing for failed events.
   */
  async enqueue(task: EventTask): Promise<void> {
    // CircuitBreaker state check (before queuing)
    if (this.config.circuitBreakerIntegration && this.config.getCircuitBreaker) {
      const breaker = this.config.getCircuitBreaker(task.hook)
      if (breaker?.getState?.() === 'OPEN') {
        throw new Error(`Circuit breaker OPEN for event: ${task.hook}`)
      }
    }

    // Create job with options
    const job = new SystemEventJob(task.hook, task.args, task.options)

    // Apply retry strategy configuration to job
    this.applyRetryStrategy(job, task)

    // Setup DLQ failure callback
    if (this.config.dlqHandler) {
      job.onFailed(async (error: Error, attempt: number) => {
        await this.handleJobFailure(task, error, attempt)
      })
    }

    // Push to queue
    const options = this.buildJobOptions(task)
    await this.queueManager.push(job, options)
  }

  /**
   * Apply retry strategy to the job based on configuration.
   */
  private applyRetryStrategy(job: SystemEventJob, task: EventTask): void {
    const strategy = this.config.retryStrategy ?? 'bull'
    const taskOptionsAny = task.options as any

    if (strategy === 'bull' || strategy === 'hybrid') {
      // Let Bull Queue handle retries with exponential backoff
      job.maxAttempts = taskOptionsAny?.maxAttempts ?? 3
      job.retryAfterSeconds = taskOptionsAny?.retryAfter ?? 5
      job.retryMultiplier = taskOptionsAny?.retryMultiplier ?? 2
    }

    // For 'core' and 'hybrid', we'd use EventPriorityQueue retry logic
    // (future implementation in Phase 5)
  }

  /**
   * Handle job failure and route to DLQ if configured.
   *
   * Called when a job exhausts all retry attempts.
   */
  async handleJobFailure(task: EventTask, error: Error, attempt: number): Promise<void> {
    if (this.config.dlqHandler) {
      try {
        await this.config.dlqHandler.handle(task, error, attempt)
      } catch (dlqError) {
        console.error('[StreamEventBackend] Failed to handle DLQ:', dlqError)
      }
    }
  }

  /**
   * Record a job failure for CircuitBreaker state management.
   *
   * Called when a job fails, regardless of retry status.
   */
  recordJobFailure(task: EventTask, error: Error): void {
    if (this.config.circuitBreakerIntegration && this.config.getCircuitBreaker) {
      const breaker = this.config.getCircuitBreaker(task.hook)
      if (breaker?.recordFailure) {
        breaker.recordFailure(error)
      }
    }
  }

  /**
   * Record a job success for CircuitBreaker state management.
   *
   * Called when a job completes successfully.
   */
  recordJobSuccess(task: EventTask): void {
    if (this.config.circuitBreakerIntegration && this.config.getCircuitBreaker) {
      const breaker = this.config.getCircuitBreaker(task.hook)
      if (breaker?.recordSuccess) {
        breaker.recordSuccess()
      }
    }
  }

  /**
   * Get the retry strategy configuration.
   */
  getRetryStrategy(): RetryStrategy {
    return this.config.retryStrategy ?? 'bull'
  }

  /**
   * Check if CircuitBreaker integration is enabled.
   */
  isCircuitBreakerEnabled(): boolean {
    return this.config.circuitBreakerIntegration ?? false
  }

  /**
   * Get the DLQ handler, if configured.
   */
  getDLQHandler(): StreamEventBackendConfig['dlqHandler'] | undefined {
    return this.config.dlqHandler
  }
}

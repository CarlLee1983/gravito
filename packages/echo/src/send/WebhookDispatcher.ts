/**
 * @fileoverview Webhook Dispatcher
 *
 * Reliably sends webhooks to external services with retry support.
 *
 * @module @gravito/echo/send
 */

import type { DeadLetterQueue } from '../dlq/DeadLetterQueue'
import type { EchoLogger } from '../observability/logging'
import {
  EchoMetrics,
  type MetricsProvider,
  NoopMetricsProvider,
  type WebhookMetricLabels,
} from '../observability/metrics'
import { NoopTracer, SpanStatusCode, type Tracer } from '../observability/tracing'
import { computeHmacSha256 } from '../receive/SignatureValidator'
import { CircuitBreaker } from '../resilience/CircuitBreaker'
import type { OutgoingWebhookRecord } from '../storage/WebhookStore'
import type {
  BatchDispatchOptions,
  BatchDispatchResult,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  RetryConfig,
  WebhookDeliveryResult,
  WebhookDispatcherConfig,
  WebhookPayload,
} from '../types'

/**
 * Default retry configuration for outgoing webhooks.
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 300000, // 5 minutes
  retryableStatuses: [408, 429, 500, 502, 503, 504],
}

/**
 * WebhookDispatcher manages the secure and reliable delivery of events to external targets.
 *
 * It provides a robust engine for sending signed webhook payloads to third-party
 * consumers, incorporating enterprise-grade reliability features such as:
 * - Exponential backoff retries for transient network/server errors.
 * - Per-host Circuit Breaking to prevent cascading failures.
 * - Dead Letter Queue (DLQ) integration for capturing permanently failed events.
 * - HMAC-SHA256 payload signing for authenticity.
 *
 * @example Dispatching a signed event
 * ```typescript
 * const dispatcher = new WebhookDispatcher({
 *   secret: 'app-outbound-secret',
 *   retry: { maxAttempts: 5 }
 * });
 *
 * const result = await dispatcher.dispatch({
 *   url: 'https://consumer.com/webhooks',
 *   event: 'order.shipped',
 *   data: { orderId: 'ORD-123' }
 * });
 *
 * if (result.success) {
 *   console.log('Webhook delivered successfully');
 * }
 * ```
 *
 * @public
 */
export class WebhookDispatcher {
  private secret: string
  private retryConfig: Required<RetryConfig>
  private timeout: number
  private userAgent: string
  private dlq?: DeadLetterQueue
  private metrics: MetricsProvider = new NoopMetricsProvider()
  private tracer: Tracer = new NoopTracer()
  private logger?: EchoLogger
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private circuitBreakerConfig?: CircuitBreakerConfig

  /**
   * Initializes the dispatcher with security and reliability policies.
   *
   * @param config - The configuration for payload signing, retry logic, and timeouts.
   */
  constructor(config: WebhookDispatcherConfig) {
    this.secret = config.secret
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry }
    this.timeout = config.timeout ?? 30000
    this.userAgent = config.userAgent ?? 'Gravito-Echo/1.0'
    this.circuitBreakerConfig = config.circuitBreaker
  }

  /**
   * Attaches a Dead Letter Queue for capturing events that fail all delivery attempts.
   *
   * @param dlq - Implementation of the DeadLetterQueue interface.
   * @returns The current instance for method chaining.
   */
  setDeadLetterQueue(dlq: DeadLetterQueue): this {
    this.dlq = dlq
    return this
  }

  /**
   * Configures the metrics provider for delivery and failure tracking.
   *
   * @param metrics - Implementation of the MetricsProvider interface.
   * @returns The current instance for method chaining.
   */
  setMetrics(metrics: MetricsProvider): this {
    this.metrics = metrics
    return this
  }

  /**
   * Configures the distributed tracer for end-to-end request visibility.
   *
   * @param tracer - Implementation of the Tracer interface.
   * @returns The current instance for method chaining.
   */
  setTracer(tracer: Tracer): this {
    this.tracer = tracer
    return this
  }

  /**
   * Configures the logger for diagnostic and delivery audit logging.
   *
   * @param logger - Implementation of the EchoLogger interface.
   * @returns The current instance for method chaining.
   */
  setLogger(logger: EchoLogger): this {
    this.logger = logger
    return this
  }

  /**
   * Resolves or creates a dedicated circuit breaker instance for a specific host.
   *
   * Using per-host isolation ensures that an outage at one consumer does not
   * block or slow down deliveries to other healthy consumers.
   *
   * @param url - Destination URL used to derive the target host.
   * @returns The active circuit breaker instance, or undefined if disabled.
   */
  private getCircuitBreaker(url: string): CircuitBreaker | undefined {
    if (!this.circuitBreakerConfig?.enabled) {
      return undefined
    }

    const host = new URL(url).host

    if (!this.circuitBreakers.has(host)) {
      const breaker = new CircuitBreaker(host, {
        ...this.circuitBreakerConfig,
        onOpen: (name) => {
          this.logger?.warn(`Circuit breaker OPEN for ${name}`, {
            component: 'dispatcher',
            host: name,
          })
          this.circuitBreakerConfig?.onOpen?.(name)
        },
        onHalfOpen: (name) => {
          this.logger?.info(`Circuit breaker HALF_OPEN for ${name}`, {
            component: 'dispatcher',
            host: name,
          })
          this.circuitBreakerConfig?.onHalfOpen?.(name)
        },
        onClose: (name) => {
          this.logger?.info(`Circuit breaker CLOSED for ${name}`, {
            component: 'dispatcher',
            host: name,
          })
          this.circuitBreakerConfig?.onClose?.(name)
        },
      })
      this.circuitBreakers.set(host, breaker)
    }

    return this.circuitBreakers.get(host)
  }

  /**
   * Retrieves the current health metrics for a specific target's circuit breaker.
   *
   * @param url - The target URL whose host metrics are requested.
   * @returns Current metrics or null if circuit breaking is not active for the host.
   */
  getCircuitBreakerMetrics(url: string): CircuitBreakerMetrics | null {
    const host = new URL(url).host
    const breaker = this.circuitBreakers.get(host)
    return breaker ? breaker.getMetrics() : null
  }

  /**
   * Manually resets a tripped circuit breaker to its CLOSED state for a specific target.
   *
   * @param url - The target URL whose host circuit should be reset.
   */
  resetCircuitBreaker(url: string): void {
    const host = new URL(url).host
    const breaker = this.circuitBreakers.get(host)
    breaker?.manualReset()
  }

  /**
   * Executes the end-to-end delivery of a signed webhook event.
   *
   * This method performs the following:
   * 1. Wraps the payload with an authenticity signature (HMAC-SHA256).
   * 2. Checks the state of the target's circuit breaker.
   * 3. Executes the HTTP POST request.
   * 4. Manages the retry lifecycle if errors occur.
   * 5. Enqueues failed events to the DLQ if configured.
   *
   * @param payload - Data and destination parameters for the dispatch.
   * @returns Final delivery outcome including success status and attempt count.
   * @throws {Error} If critical internal operations (like signing) fail.
   */
  async dispatch<T = unknown>(payload: WebhookPayload<T>): Promise<WebhookDeliveryResult> {
    return this.tracer.withSpan('echo.dispatch_webhook', async (span) => {
      const startTime = performance.now()
      const labels: WebhookMetricLabels = { event_type: payload.event }

      span.setAttributes({
        'echo.direction': 'outgoing',
        'echo.event': payload.event,
        'echo.url': payload.url,
        'http.method': 'POST',
        'http.url': payload.url,
      })

      const result = await this.dispatchInternal(payload)

      const duration = (performance.now() - startTime) / 1000
      labels.status = result.success ? 'success' : 'failure'
      labels.status_code = result.statusCode?.toString()

      this.metrics.increment(EchoMetrics.OUTGOING_TOTAL, labels as Record<string, string>)
      this.metrics.histogram(
        EchoMetrics.OUTGOING_DURATION,
        duration,
        labels as Record<string, string>
      )

      if (result.attempt > 1) {
        this.metrics.increment(EchoMetrics.OUTGOING_RETRIES, {
          event_type: payload.event,
        })
      }

      span.setAttributes({
        'echo.success': result.success,
        'echo.attempt': result.attempt,
        'echo.duration_ms': result.duration,
      })

      if (result.statusCode) {
        span.setAttribute('http.status_code', result.statusCode)
      }

      if (result.success) {
        span.setStatus({ code: SpanStatusCode.OK })
      } else {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: result.error,
        })

        this.metrics.increment(EchoMetrics.OUTGOING_FAILURES, {
          event_type: payload.event,
          error_type: this.categorizeError(result),
        })
      }

      return result
    })
  }

  /**
   * Internal orchestration for the delivery retry loop.
   *
   * @param payload - The webhook payload.
   * @returns Final delivery result after all retry attempts.
   */
  private async dispatchInternal<T = unknown>(
    payload: WebhookPayload<T>
  ): Promise<WebhookDeliveryResult> {
    let lastResult: WebhookDeliveryResult | null = null

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      const result = await this.attemptDelivery(payload, attempt)
      lastResult = result

      if (result.success) {
        return result
      }

      // Check if we should retry
      if (attempt < this.retryConfig.maxAttempts) {
        const shouldRetry = this.shouldRetry(result)
        if (shouldRetry) {
          const delay = this.calculateDelay(attempt)
          await this.sleep(delay)
          continue
        }
      }

      // Don't retry if status is not retryable
      break
    }

    // If we exhausted retries or hit non-retryable error, check DLQ
    if (this.dlq && lastResult && !lastResult.success) {
      await this.dlq.enqueue({
        type: 'outgoing',
        originalEvent: {
          url: payload.url,
          event: payload.event,
          payload: payload.data,
          createdAt: new Date(),
          status: 'failed',
          attempts: [], // Store will track attempts separately, or we can add this attempt here
        } as OutgoingWebhookRecord,
        failureReason: lastResult.error ?? 'Unknown error',
        failedAt: new Date(),
        retryCount: lastResult.attempt,
      })
    }

    if (!lastResult) {
      throw new Error('No delivery attempts were made')
    }

    return lastResult
  }

  /**
   * Dispatches a batch of webhooks concurrently using an optimized worker pool.
   *
   * This method balances high throughput with source/target resource constraints
   * by allowing you to tune concurrency and error propagation policies.
   *
   * @param payloads - Collection of payloads to deliver.
   * @param options - Tuning parameters for concurrency and failure handling.
   * @returns A summary result of all dispatch attempts in the batch.
   *
   * @example Batch dispatch with concurrency control
   * ```typescript
   * const results = await dispatcher.dispatchBatch(payloads, {
   *   concurrency: 10,
   *   stopOnFirstFailure: false
   * });
   * console.log(`Batch complete. Succeeded: ${results.succeeded}, Failed: ${results.failed}`);
   * ```
   */
  async dispatchBatch<T = unknown>(
    payloads: WebhookPayload<T>[],
    options: BatchDispatchOptions = {}
  ): Promise<BatchDispatchResult> {
    const concurrency = options.concurrency ?? 5
    const stopOnFirstFailure = options.stopOnFirstFailure ?? false

    const results: BatchDispatchResult['results'] = []
    let succeeded = 0
    let failed = 0
    let stopped = false

    // Process in chunks
    for (let i = 0; i < payloads.length && !stopped; i += concurrency) {
      const chunk = payloads.slice(i, i + concurrency)

      const chunkResults = await Promise.all(
        chunk.map(async (payload) => {
          if (stopped) {
            return {
              payload,
              result: {
                success: false,
                attempt: 0,
                duration: 0,
                deliveredAt: new Date(),
                error: 'Batch dispatch stopped',
              } as WebhookDeliveryResult,
            }
          }

          const result = await this.dispatch(payload)

          if (result.success) {
            succeeded++
          } else {
            failed++
            if (stopOnFirstFailure) {
              stopped = true
            }
          }

          return { payload, result }
        })
      )

      results.push(...chunkResults)
    }

    return {
      total: payloads.length,
      succeeded,
      failed,
      results,
    }
  }

  /**
   * Re-attempts the delivery of a previously failed event from the Dead Letter Queue.
   *
   * If the delivery succeeds, the event is automatically removed from the DLQ.
   *
   * @param id - The unique identifier of the event in the DLQ.
   * @returns Result of the retry attempt, or null if the event ID is invalid.
   */
  async retryFromDlq(id: string): Promise<WebhookDeliveryResult | null> {
    if (!this.dlq) {
      return null
    }

    const events = await this.dlq.peek(100)
    const event = events.find((e) => e.id === id)

    if (!event || event.type !== 'outgoing') {
      return null
    }

    const outgoing = event.originalEvent as OutgoingWebhookRecord

    const result = await this.dispatch({
      url: outgoing.url,
      event: outgoing.event,
      data: outgoing.payload,
    })

    if (result.success) {
      await this.dlq.dequeue(id)
    } else {
      event.retryCount++
      event.lastRetryAt = new Date()
    }

    return result
  }

  /**
   * Executes a single delivery attempt including signing and circuit breaker check.
   *
   * @param payload - The webhook payload.
   * @param attempt - The current attempt number.
   * @returns Detailed result of the single attempt.
   */
  private async attemptDelivery<T = unknown>(
    payload: WebhookPayload<T>,
    attempt: number
  ): Promise<WebhookDeliveryResult> {
    const breaker = this.getCircuitBreaker(payload.url)

    const deliveryFn = async () => {
      const startTime = Date.now()
      const timestamp = Math.floor(Date.now() / 1000)
      const webhookId = payload.id ?? crypto.randomUUID()

      try {
        // Build request body
        const body = JSON.stringify({
          id: webhookId,
          type: payload.event,
          timestamp,
          data: payload.data,
        })

        // Compute signature
        const signedPayload = `${timestamp}.${body}`
        const signature = await computeHmacSha256(signedPayload, this.secret)

        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        try {
          const response = await fetch(payload.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': this.userAgent,
              'X-Webhook-ID': webhookId,
              'X-Webhook-Timestamp': String(timestamp),
              'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
            },
            body,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          const duration = Date.now() - startTime
          const responseBody = await response.text()

          return {
            success: response.ok,
            statusCode: response.status,
            body: responseBody,
            attempt,
            duration,
            deliveredAt: new Date(),
            error: response.ok ? undefined : `HTTP ${response.status}`,
          }
        } finally {
          clearTimeout(timeoutId)
        }
      } catch (error) {
        const duration = Date.now() - startTime

        return {
          success: false,
          attempt,
          duration,
          deliveredAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    // Use circuit breaker if enabled
    if (breaker) {
      try {
        return await breaker.execute(deliveryFn)
      } catch (error) {
        if (error instanceof Error && error.message.includes('Circuit breaker is OPEN')) {
          return {
            success: false,
            attempt,
            duration: 0,
            deliveredAt: new Date(),
            error: error.message,
          }
        }
        throw error
      }
    }

    // Fallback to direct execution if circuit breaker is disabled
    return await deliveryFn()
  }

  /**
   * Internal logic to decide if an attempt should be retried.
   *
   * @param result - The delivery result to evaluate.
   * @returns True if retry is eligible.
   */
  private shouldRetry(result: WebhookDeliveryResult): boolean {
    if (!result.statusCode) {
      // Network error, retry
      return true
    }

    return this.retryConfig.retryableStatuses.includes(result.statusCode)
  }

  /**
   * Calculates the exponential backoff delay for the next attempt.
   *
   * @param attempt - The current attempt number.
   * @returns Delay in milliseconds.
   */
  private calculateDelay(attempt: number): number {
    const delay =
      this.retryConfig.initialDelay * this.retryConfig.backoffMultiplier ** (attempt - 1)

    return Math.min(delay, this.retryConfig.maxDelay)
  }

  /**
   * Standardized categorization of delivery errors for metrics.
   *
   * @param result - The delivery result to categorize.
   * @returns Category string.
   */
  private categorizeError(result: WebhookDeliveryResult): string {
    if (!result.statusCode) {
      return 'network_error'
    }
    if (result.statusCode >= 500) {
      return 'server_error'
    }
    if (result.statusCode >= 400) {
      return 'client_error'
    }
    return 'other'
  }

  /**
   * Utility for asynchronous sleep.
   *
   * @param ms - Duration to sleep in ms.
   * @returns Promise that resolves after delay.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

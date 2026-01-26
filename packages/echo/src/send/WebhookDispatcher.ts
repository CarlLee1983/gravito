/**
 * @fileoverview Webhook Dispatcher
 *
 * Reliably sends webhooks to external services with retry support.
 *
 * @module @gravito/echo/send
 */

import type { DeadLetterQueue } from '../dlq/DeadLetterQueue'
import {
  EchoMetrics,
  type MetricsProvider,
  NoopMetricsProvider,
  type WebhookMetricLabels,
} from '../observability/metrics'
import { NoopTracer, SpanStatusCode, type Tracer } from '../observability/tracing'
import { computeHmacSha256 } from '../receive/SignatureValidator'
import type { OutgoingWebhookRecord } from '../storage/WebhookStore'
import type {
  BatchDispatchOptions,
  BatchDispatchResult,
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
 * WebhookDispatcher handles the reliable delivery of webhooks to external targets.
 *
 * It supports HMAC-SHA256 signing of payloads, exponential backoff retries,
 * and integration with Dead Letter Queues (DLQ) for failed deliveries.
 *
 * @example
 * ```typescript
 * const dispatcher = new WebhookDispatcher({
 *   secret: 'my-webhook-secret',
 *   retry: { maxAttempts: 5 }
 * });
 *
 * // Send a single webhook
 * const result = await dispatcher.dispatch({
 *   url: 'https://example.com/webhook',
 *   event: 'order.created',
 *   data: { orderId: 123 }
 * });
 *
 * if (result.success) {
 *   console.log('Delivered!');
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

  /**
   * Initializes the dispatcher with the provided configuration.
   *
   * @param config - The configuration for signing, retries, and timeouts.
   */
  constructor(config: WebhookDispatcherConfig) {
    this.secret = config.secret
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry }
    this.timeout = config.timeout ?? 30000
    this.userAgent = config.userAgent ?? 'Gravito-Echo/1.0'
  }

  /**
   * Configures the Dead Letter Queue for failed delivery attempts.
   *
   * @param dlq - The DeadLetterQueue implementation to use.
   * @returns The dispatcher instance for chaining.
   */
  setDeadLetterQueue(dlq: DeadLetterQueue): this {
    this.dlq = dlq
    return this
  }

  /**
   * Configures the metrics provider for observability.
   *
   * @param metrics - The MetricsProvider implementation to use.
   * @returns The dispatcher instance for chaining.
   */
  setMetrics(metrics: MetricsProvider): this {
    this.metrics = metrics
    return this
  }

  /**
   * Configures the tracer for distributed tracing.
   *
   * @param tracer - The Tracer implementation to use.
   * @returns The dispatcher instance for chaining.
   */
  setTracer(tracer: Tracer): this {
    this.tracer = tracer
    return this
  }

  /**
   * Dispatches a webhook to the specified URL with automatic retries.
   *
   * This method signs the payload, attempts delivery, and retries based on
   * the configured retry strategy if the delivery fails.
   *
   * @param payload - The webhook payload including target URL and data.
   * @returns A promise resolving to the delivery result.
   * @throws Error if signing or network operations encounter an unrecoverable failure.
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
   * Internal method to handle the retry loop for webhook delivery.
   *
   * @param payload - The webhook payload.
   * @returns A promise resolving to the final delivery result.
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
   * Dispatches a batch of webhooks concurrently.
   *
   * @param payloads - An array of webhook payloads to send.
   * @param options - Options for concurrency and failure handling.
   * @returns A promise resolving to the batch dispatch result.
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
   * Retries a failed delivery from the Dead Letter Queue.
   *
   * @param id - The unique identifier of the DLQ entry.
   * @returns A promise resolving to the delivery result or null if not found.
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
   * Performs a single delivery attempt.
   *
   * @param payload - The webhook payload.
   * @param attempt - The current attempt number.
   * @returns A promise resolving to the delivery result.
   */
  private async attemptDelivery<T = unknown>(
    payload: WebhookPayload<T>,
    attempt: number
  ): Promise<WebhookDeliveryResult> {
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

  /**
   * Determines if a delivery should be retried based on the result.
   *
   * @param result - The delivery result to evaluate.
   * @returns True if the delivery should be retried.
   */
  private shouldRetry(result: WebhookDeliveryResult): boolean {
    if (!result.statusCode) {
      // Network error, retry
      return true
    }

    return this.retryConfig.retryableStatuses.includes(result.statusCode)
  }

  /**
   * Calculates the delay for the next retry attempt using exponential backoff.
   *
   * @param attempt - The current attempt number.
   * @returns The delay in milliseconds.
   */
  private calculateDelay(attempt: number): number {
    const delay =
      this.retryConfig.initialDelay * this.retryConfig.backoffMultiplier ** (attempt - 1)

    return Math.min(delay, this.retryConfig.maxDelay)
  }

  /**
   * Helper method to pause execution.
   *
   * @param ms - The number of milliseconds to sleep.
   * @returns A promise that resolves after the delay.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Categorizes delivery errors for metrics reporting.
   *
   * @param result - The delivery result to categorize.
   * @returns A string representing the error category.
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
}

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
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 300000, // 5 minutes
  retryableStatuses: [408, 429, 500, 502, 503, 504],
}

/**
 * Webhook Dispatcher
 *
 * Sends webhooks with signature and retry support.
 *
 * @example
 * ```typescript
 * const dispatcher = new WebhookDispatcher({
 *   secret: 'my-webhook-secret',
 *   retry: { maxAttempts: 5 }
 * })
 *
 * const result = await dispatcher.dispatch({
 *   url: 'https://example.com/webhook',
 *   event: 'order.created',
 *   data: { orderId: 123 }
 * })
 * ```
 */
export class WebhookDispatcher {
  private secret: string
  private retryConfig: Required<RetryConfig>
  private timeout: number
  private userAgent: string
  private dlq?: DeadLetterQueue
  private metrics: MetricsProvider = new NoopMetricsProvider()
  private tracer: Tracer = new NoopTracer()

  constructor(config: WebhookDispatcherConfig) {
    this.secret = config.secret
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry }
    this.timeout = config.timeout ?? 30000
    this.userAgent = config.userAgent ?? 'Gravito-Echo/1.0'
  }

  /**
   * Set Dead Letter Queue
   */
  setDeadLetterQueue(dlq: DeadLetterQueue): this {
    this.dlq = dlq
    return this
  }

  /**
   * Set Metrics Provider
   */
  setMetrics(metrics: MetricsProvider): this {
    this.metrics = metrics
    return this
  }

  /**
   * Set Tracer
   */
  setTracer(tracer: Tracer): this {
    this.tracer = tracer
    return this
  }

  /**
   * Dispatch a webhook with retries
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

    return lastResult!
  }

  /**
   * Dispatch a batch of webhooks
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
   * Retry an event from DLQ
   */
  async retryFromDlq(id: string): Promise<WebhookDeliveryResult | null> {
    if (!this.dlq) return null

    const events = await this.dlq.peek(100)
    const event = events.find((e) => e.id === id)

    if (!event || event.type !== 'outgoing') return null

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
   * Attempt a single delivery
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
   * Check if we should retry based on result
   */
  private shouldRetry(result: WebhookDeliveryResult): boolean {
    if (!result.statusCode) {
      // Network error, retry
      return true
    }

    return this.retryConfig.retryableStatuses.includes(result.statusCode)
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay =
      this.retryConfig.initialDelay * this.retryConfig.backoffMultiplier ** (attempt - 1)

    return Math.min(delay, this.retryConfig.maxDelay)
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private categorizeError(result: WebhookDeliveryResult): string {
    if (!result.statusCode) return 'network_error'
    if (result.statusCode >= 500) return 'server_error'
    if (result.statusCode >= 400) return 'client_error'
    return 'other'
  }
}

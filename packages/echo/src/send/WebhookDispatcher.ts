/**
 * @fileoverview Webhook Dispatcher
 *
 * Reliably sends webhooks to external services with retry support.
 *
 * @module @gravito/echo/send
 */

import { computeHmacSha256 } from '../receive/SignatureValidator'
import type {
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

  constructor(config: WebhookDispatcherConfig) {
    this.secret = config.secret
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry }
    this.timeout = config.timeout ?? 30000
    this.userAgent = config.userAgent ?? 'Gravito-Echo/1.0'
  }

  /**
   * Dispatch a webhook with retries
   */
  async dispatch<T = unknown>(payload: WebhookPayload<T>): Promise<WebhookDeliveryResult> {
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
      return result
    }

    return lastResult!
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
}

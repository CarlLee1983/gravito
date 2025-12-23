/**
 * @fileoverview Generic webhook provider
 *
 * Simple HMAC-SHA256 signature verification.
 *
 * @module @gravito/echo/providers
 */

import {
  computeHmacSha256,
  timingSafeEqual,
  validateTimestamp,
} from '../receive/SignatureValidator'
import type { WebhookProvider, WebhookVerificationResult } from '../types'

/**
 * Generic webhook provider using HMAC-SHA256
 *
 * Expected headers:
 * - X-Webhook-Signature: HMAC-SHA256 hex signature
 * - X-Webhook-Timestamp: Unix timestamp (optional)
 *
 * @example
 * ```typescript
 * const provider = new GenericProvider()
 * const result = await provider.verify(body, headers, secret)
 * ```
 */
export class GenericProvider implements WebhookProvider {
  readonly name = 'generic'

  private signatureHeader: string
  private timestampHeader: string
  private tolerance: number

  constructor(
    options: {
      signatureHeader?: string
      timestampHeader?: string
      tolerance?: number
    } = {}
  ) {
    this.signatureHeader = options.signatureHeader ?? 'x-webhook-signature'
    this.timestampHeader = options.timestampHeader ?? 'x-webhook-timestamp'
    this.tolerance = options.tolerance ?? 300
  }

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    // Get signature from headers
    const signature = this.getHeader(headers, this.signatureHeader)
    if (!signature) {
      return {
        valid: false,
        error: `Missing signature header: ${this.signatureHeader}`,
      }
    }

    // Validate timestamp if present
    const timestampStr = this.getHeader(headers, this.timestampHeader)
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10)
      if (isNaN(timestamp) || !validateTimestamp(timestamp, this.tolerance)) {
        return {
          valid: false,
          error: 'Timestamp validation failed',
        }
      }
    }

    // Compute expected signature
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8')
    const expectedSignature = await computeHmacSha256(payloadStr, secret)

    // Compare signatures
    if (!timingSafeEqual(signature.toLowerCase(), expectedSignature.toLowerCase())) {
      return {
        valid: false,
        error: 'Signature verification failed',
      }
    }

    // Parse payload
    try {
      const parsed = JSON.parse(payloadStr)
      return {
        valid: true,
        payload: parsed,
        eventType: parsed.type ?? parsed.event ?? parsed.eventType,
        webhookId: parsed.id ?? parsed.webhookId,
      }
    } catch {
      return {
        valid: true,
        payload: payloadStr,
      }
    }
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()]
    return Array.isArray(value) ? value[0] : value
  }
}

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
import type { WebhookVerificationResult } from '../types'
import { BaseProvider, type ProviderOptions } from './base/BaseProvider'

export interface GenericProviderOptions extends ProviderOptions {
  signatureHeader?: string
  timestampHeader?: string
}

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
export class GenericProvider extends BaseProvider {
  readonly name = 'generic'

  private signatureHeader: string
  private timestampHeader: string

  constructor(options: GenericProviderOptions = {}) {
    super(options)
    this.signatureHeader = options.signatureHeader ?? 'x-webhook-signature'
    this.timestampHeader = options.timestampHeader ?? 'x-webhook-timestamp'
  }

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    // Get signature from headers
    const signature = this.getHeader(headers, this.signatureHeader)
    if (!signature) {
      return this.createFailure(`Missing signature header: ${this.signatureHeader}`)
    }

    // Validate timestamp if present
    const timestampStr = this.getHeader(headers, this.timestampHeader)
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10)
      if (Number.isNaN(timestamp) || !validateTimestamp(timestamp, this.tolerance)) {
        return this.createFailure('Timestamp validation failed')
      }
    }

    // Compute expected signature
    const payloadStr = this.payloadToString(payload)
    const expectedSignature = await computeHmacSha256(payloadStr, secret)

    // Compare signatures
    if (!timingSafeEqual(signature.toLowerCase(), expectedSignature.toLowerCase())) {
      return this.createFailure('Signature verification failed')
    }

    // Parse payload
    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createSuccess(payloadStr)
    }

    const parsed = parseResult.data as Record<string, unknown>
    return this.createSuccess(parsed, {
      eventType: (parsed.type ?? parsed.event ?? parsed.eventType) as string | undefined,
      webhookId: (parsed.id ?? parsed.webhookId) as string | undefined,
    })
  }
}

/**
 * Generic webhook provider.
 * @module @gravito/echo/providers
 */

import {
  computeHmacSha256,
  timingSafeEqual,
  validateTimestamp,
} from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'
import { BaseProvider, type ProviderOptions } from './base/BaseProvider'

/**
 * Configuration options for the generic provider.
 */
export interface GenericProviderOptions extends ProviderOptions {
  /**
   * Custom header name for the signature.
   * @defaultValue 'x-webhook-signature'
   */
  signatureHeader?: string
  /**
   * Custom header name for the timestamp.
   * @defaultValue 'x-webhook-timestamp'
   */
  timestampHeader?: string
}

/**
 * Generic webhook provider using HMAC-SHA256 for signature verification.
 *
 * Expected headers:
 * - X-Webhook-Signature: HMAC-SHA256 hex signature.
 * - X-Webhook-Timestamp: Unix timestamp (optional, used for replay protection).
 *
 * @example
 * ```typescript
 * const provider = new GenericProvider({
 *   signatureHeader: 'X-Custom-Sig',
 *   tolerance: 600
 * });
 * const result = await provider.verify(body, headers, secret);
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

  /**
   * Verifies the webhook using HMAC-SHA256.
   *
   * @param payload - Raw request body.
   * @param headers - Request headers.
   * @param secret - Secret key for HMAC computation.
   * @returns Verification result.
   * @throws Error if signature computation fails.
   */
  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, this.signatureHeader)
    if (!signature) {
      return this.createFailure(`Missing signature header: ${this.signatureHeader}`)
    }

    const timestampStr = this.getHeader(headers, this.timestampHeader)
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10)
      if (Number.isNaN(timestamp) || !validateTimestamp(timestamp, this.tolerance)) {
        return this.createFailure('Timestamp validation failed')
      }
    }

    const payloadStr = this.payloadToString(payload)
    const expectedSignature = await computeHmacSha256(payloadStr, secret)

    if (!timingSafeEqual(signature.toLowerCase(), expectedSignature.toLowerCase())) {
      return this.createFailure('Signature verification failed')
    }

    const parseResult = this.safeParseJson(payloadStr)
    if (parseResult.success === false) {
      return this.createSuccess(payloadStr)
    }

    const parsed = parseResult.data as Record<string, unknown>
    return this.createSuccess(parsed, {
      eventType: (parsed.type ?? parsed.event ?? parsed.eventType) as string | undefined,
      webhookId: (parsed.id ?? parsed.webhookId) as string | undefined,
    })
  }
}

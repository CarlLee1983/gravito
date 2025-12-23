/**
 * @fileoverview Stripe webhook provider
 *
 * Implements Stripe's webhook signature verification.
 * @see https://stripe.com/docs/webhooks/signatures
 *
 * @module @gravito/echo/providers
 */

import {
  computeHmacSha256,
  parseStripeSignature,
  timingSafeEqual,
  validateTimestamp,
} from '../receive/SignatureValidator'
import type { WebhookProvider, WebhookVerificationResult } from '../types'

/**
 * Stripe webhook provider
 *
 * Verifies Stripe webhook signatures using their standard format.
 *
 * @example
 * ```typescript
 * const provider = new StripeProvider()
 * const result = await provider.verify(body, headers, process.env.STRIPE_WEBHOOK_SECRET)
 * ```
 */
export class StripeProvider implements WebhookProvider {
  readonly name = 'stripe'

  private tolerance: number

  constructor(options: { tolerance?: number } = {}) {
    this.tolerance = options.tolerance ?? 300
  }

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    // Get signature header
    const signatureHeader = this.getHeader(headers, 'stripe-signature')
    if (!signatureHeader) {
      return {
        valid: false,
        error: 'Missing Stripe-Signature header',
      }
    }

    // Parse signature header
    const parsed = parseStripeSignature(signatureHeader)
    if (!parsed) {
      return {
        valid: false,
        error: 'Invalid Stripe-Signature header format',
      }
    }

    const { timestamp, signatures } = parsed

    // Validate timestamp
    if (!validateTimestamp(timestamp, this.tolerance)) {
      return {
        valid: false,
        error: `Timestamp outside tolerance window (${this.tolerance}s)`,
      }
    }

    // Compute expected signature
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8')
    const signedPayload = `${timestamp}.${payloadStr}`
    const expectedSignature = await computeHmacSha256(signedPayload, secret)

    // Check if any signature matches
    const signatureValid = signatures.some((sig) =>
      timingSafeEqual(sig.toLowerCase(), expectedSignature.toLowerCase())
    )

    if (!signatureValid) {
      return {
        valid: false,
        error: 'Signature verification failed',
      }
    }

    // Parse payload
    try {
      const event = JSON.parse(payloadStr)
      return {
        valid: true,
        payload: event,
        eventType: event.type,
        webhookId: event.id,
      }
    } catch {
      return {
        valid: false,
        error: 'Failed to parse webhook payload',
      }
    }
  }

  parseEventType(payload: unknown): string | undefined {
    if (typeof payload === 'object' && payload !== null && 'type' in payload) {
      return (payload as { type: string }).type
    }
    return undefined
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()]
    return Array.isArray(value) ? value[0] : value
  }
}

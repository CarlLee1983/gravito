/**
 * Stripe webhook provider.
 * @module @gravito/echo/providers
 */

import {
  computeHmacSha256,
  parseStripeSignature,
  timingSafeEqual,
  validateTimestamp,
} from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'
import { BaseProvider } from './base/BaseProvider'

/**
 * Stripe webhook provider.
 *
 * Verifies Stripe webhook signatures using their standard format.
 * @see {@link https://stripe.com/docs/webhooks/signatures | Stripe Webhook Signatures}
 *
 * @example
 * ```typescript
 * const provider = new StripeProvider();
 * const result = await provider.verify(body, headers, process.env.STRIPE_WEBHOOK_SECRET);
 * ```
 */
export class StripeProvider extends BaseProvider {
  readonly name = 'stripe'

  constructor(options: { tolerance?: number } = {}) {
    super(options)
  }

  /**
   * Verifies the Stripe webhook signature.
   *
   * @param payload - Raw request body.
   * @param headers - Request headers.
   * @param secret - Stripe webhook secret (signing secret).
   * @returns Verification result.
   * @throws Error if signature computation fails.
   */
  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signatureHeader = this.getHeader(headers, 'stripe-signature')
    if (!signatureHeader) {
      return this.createFailure('Missing Stripe-Signature header')
    }

    const parsed = parseStripeSignature(signatureHeader)
    if (!parsed) {
      return this.createFailure('Invalid Stripe-Signature header format')
    }

    const { timestamp, signatures } = parsed

    if (!validateTimestamp(timestamp, this.tolerance)) {
      return this.createFailure(`Timestamp outside tolerance window (${this.tolerance}s)`)
    }

    const payloadStr = this.payloadToString(payload)
    const signedPayload = `${timestamp}.${payloadStr}`
    const expectedSignature = await computeHmacSha256(signedPayload, secret)

    const signatureValid = signatures.some((sig) =>
      timingSafeEqual(sig.toLowerCase(), expectedSignature.toLowerCase())
    )

    if (!signatureValid) {
      return this.createFailure('Signature verification failed')
    }

    const parseResult = this.safeParseJson(payloadStr)
    if (parseResult.success === false) {
      return this.createFailure(parseResult.error)
    }

    const event = parseResult.data as Record<string, unknown>
    return this.createSuccess(event, {
      eventType: event.type as string | undefined,
      webhookId: event.id as string | undefined,
    })
  }

  /**
   * Extracts the event type from the Stripe payload.
   */
  override parseEventType(payload: unknown): string | undefined {
    if (typeof payload === 'object' && payload !== null && 'type' in payload) {
      return (payload as { type: string }).type
    }
    return undefined
  }
}

import { computeHmacSha1Base64, timingSafeEqual } from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'
import { BaseProvider, type ProviderOptions } from './base/BaseProvider'

/**
 * Twilio webhook provider.
 *
 * Verifies Twilio webhook signatures using the `X-Twilio-Signature` header.
 * @see {@link https://www.twilio.com/docs/usage/security#validating-requests | Twilio Request Validation}
 *
 * @example
 * ```typescript
 * const provider = new TwilioProvider({ baseUrl: 'https://api.example.com/webhooks/twilio' });
 * const result = await provider.verify(body, headers, process.env.TWILIO_AUTH_TOKEN);
 * ```
 */
export class TwilioProvider extends BaseProvider {
  readonly name = 'twilio'

  private baseUrl?: string

  constructor(options: ProviderOptions & { baseUrl?: string } = {}) {
    super(options)
    this.baseUrl = options.baseUrl
  }

  /**
   * Verifies the Twilio webhook signature.
   *
   * @param payload - Raw request body (URL-encoded).
   * @param headers - Request headers.
   * @param secret - Twilio Auth Token.
   * @returns Verification result.
   * @throws Error if signature computation fails.
   */
  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, 'x-twilio-signature')
    if (!signature) {
      return this.createFailure('Missing X-Twilio-Signature header')
    }

    const url = this.baseUrl ?? ''
    const payloadStr = this.payloadToString(payload)

    const params = new URLSearchParams(payloadStr)
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}${value}`)
      .join('')

    const signaturePayload = url + sortedParams
    const expectedSignature = await computeHmacSha1Base64(signaturePayload, secret)

    if (!timingSafeEqual(signature, expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    return this.createSuccess(Object.fromEntries(params), {
      eventType: params.get('EventType') ?? undefined,
    })
  }
}

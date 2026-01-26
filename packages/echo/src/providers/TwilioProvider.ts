import { computeHmacSha1Base64, timingSafeEqual } from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'
import { BaseProvider, type ProviderOptions } from './base/BaseProvider'

/**
 * Twilio webhook provider
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export class TwilioProvider extends BaseProvider {
  readonly name = 'twilio'

  private baseUrl?: string

  constructor(options: ProviderOptions & { baseUrl?: string } = {}) {
    super(options)
    this.baseUrl = options.baseUrl
  }

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

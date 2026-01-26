import { computeHmacSha256, timingSafeEqual } from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'
import { BaseProvider } from './base/BaseProvider'

/**
 * Linear webhook provider
 * @see https://developers.linear.app/docs/graphql/webhooks#signature-verification
 */
export class LinearProvider extends BaseProvider {
  readonly name = 'linear'

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, 'linear-signature')
    if (!signature) {
      return this.createFailure('Missing Linear-Signature header')
    }

    const payloadStr = this.payloadToString(payload)
    const expectedSignature = await computeHmacSha256(payloadStr, secret)

    if (!timingSafeEqual(signature, expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createFailure(parseResult.error)
    }

    const data = parseResult.data as Record<string, unknown>
    return this.createSuccess(data, {
      eventType: (data.type ?? data.action) as string | undefined,
      webhookId: this.getHeader(headers, 'linear-delivery'),
    })
  }
}

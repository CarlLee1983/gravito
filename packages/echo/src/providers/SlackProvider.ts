import {
  computeHmacSha256,
  timingSafeEqual,
  validateTimestamp,
} from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'
import { BaseProvider } from './base/BaseProvider'

/**
 * Slack webhook provider
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export class SlackProvider extends BaseProvider {
  readonly name = 'slack'

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, 'x-slack-signature')
    const timestampStr = this.getHeader(headers, 'x-slack-request-timestamp')

    if (!signature) {
      return this.createFailure('Missing X-Slack-Signature header')
    }
    if (!timestampStr) {
      return this.createFailure('Missing X-Slack-Request-Timestamp header')
    }

    if (!signature.startsWith('v0=')) {
      return this.createFailure('Invalid signature format (expected v0=...)')
    }

    const timestamp = parseInt(timestampStr, 10)
    if (!validateTimestamp(timestamp, this.tolerance)) {
      return this.createFailure(`Timestamp outside tolerance window (${this.tolerance}s)`)
    }

    const payloadStr = this.payloadToString(payload)
    const sigBasestring = `v0:${timestamp}:${payloadStr}`
    const expectedSignature = await computeHmacSha256(sigBasestring, secret)

    if (!timingSafeEqual(signature.slice(3), expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createFailure(parseResult.error)
    }

    const data = parseResult.data as Record<string, unknown>
    return this.createSuccess(data, {
      eventType: data.type as string | undefined,
      webhookId: data.event_id as string | undefined,
    })
  }
}

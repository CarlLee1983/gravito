import {
  computeHmacSha256,
  timingSafeEqual,
  validateTimestamp,
} from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'
import { BaseProvider } from './base/BaseProvider'

/**
 * Paddle webhook provider
 * @see https://developer.paddle.com/webhooks/signature-verification
 */
export class PaddleProvider extends BaseProvider {
  readonly name = 'paddle'

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signatureHeader = this.getHeader(headers, 'paddle-signature')
    if (!signatureHeader) {
      return this.createFailure('Missing Paddle-Signature header')
    }

    const parsed = this.parsePaddleSignature(signatureHeader)
    if (!parsed) {
      return this.createFailure('Invalid Paddle-Signature format')
    }

    const { timestamp, signature } = parsed

    if (!validateTimestamp(timestamp, this.tolerance)) {
      return this.createFailure(`Timestamp outside tolerance window (${this.tolerance}s)`)
    }

    const payloadStr = this.payloadToString(payload)
    const signedPayload = `${timestamp}:${payloadStr}`
    const expectedSignature = await computeHmacSha256(signedPayload, secret)

    if (!timingSafeEqual(signature, expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createFailure(parseResult.error)
    }

    const data = parseResult.data as Record<string, unknown>
    return this.createSuccess(data, {
      eventType: data.event_type as string | undefined,
      webhookId: data.event_id as string | undefined,
    })
  }

  private parsePaddleSignature(header: string): { timestamp: number; signature: string } | null {
    const parts = header.split(';')
    let timestamp: number | undefined
    let signature: string | undefined

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (key === 'ts' && value) {
        timestamp = parseInt(value, 10)
      } else if (key === 'h1' && value) {
        signature = value
      }
    }

    if (timestamp === undefined || !signature) {
      return null
    }

    return { timestamp, signature }
  }
}

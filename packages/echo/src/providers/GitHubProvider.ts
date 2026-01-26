/**
 * GitHub webhook provider.
 * @module @gravito/echo/providers
 */

import { computeHmacSha256, timingSafeEqual } from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'
import { BaseProvider } from './base/BaseProvider'

/**
 * GitHub webhook provider.
 *
 * Verifies GitHub webhook signatures using the `X-Hub-Signature-256` header.
 * @see {@link https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries | GitHub Webhook Validation}
 *
 * @example
 * ```typescript
 * const provider = new GitHubProvider();
 * const result = await provider.verify(body, headers, process.env.GITHUB_WEBHOOK_SECRET);
 * ```
 */
export class GitHubProvider extends BaseProvider {
  readonly name = 'github'

  /**
   * Verifies the GitHub webhook signature.
   *
   * @param payload - Raw request body.
   * @param headers - Request headers.
   * @param secret - GitHub webhook secret.
   * @returns Verification result.
   * @throws Error if signature computation fails.
   */
  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, 'x-hub-signature-256')
    if (!signature) {
      return this.createFailure('Missing X-Hub-Signature-256 header')
    }

    if (!signature.startsWith('sha256=')) {
      return this.createFailure('Invalid signature format (expected sha256=...)')
    }

    const signatureValue = signature.slice(7)

    const payloadStr = this.payloadToString(payload)
    const expectedSignature = await computeHmacSha256(payloadStr, secret)

    if (!timingSafeEqual(signatureValue.toLowerCase(), expectedSignature.toLowerCase())) {
      return this.createFailure('Signature verification failed')
    }

    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createFailure('Failed to parse webhook payload')
    }

    const event = parseResult.data as Record<string, unknown>
    const eventType = this.getHeader(headers, 'x-github-event')
    const deliveryId = this.getHeader(headers, 'x-github-delivery')

    return this.createSuccess(event, {
      eventType: eventType ?? undefined,
      webhookId: deliveryId ?? undefined,
    })
  }

  /**
   * Extracts the action from the GitHub payload if available.
   */
  override parseEventType(payload: unknown): string | undefined {
    if (typeof payload === 'object' && payload !== null && 'action' in payload) {
      return (payload as { action: string }).action
    }
    return undefined
  }
}

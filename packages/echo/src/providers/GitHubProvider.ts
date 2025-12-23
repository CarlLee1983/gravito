/**
 * @fileoverview GitHub webhook provider
 *
 * Implements GitHub's webhook signature verification.
 * @see https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 *
 * @module @gravito/echo/providers
 */

import { computeHmacSha256, timingSafeEqual } from '../receive/SignatureValidator'
import type { WebhookProvider, WebhookVerificationResult } from '../types'

/**
 * GitHub webhook provider
 *
 * Verifies GitHub webhook signatures using the X-Hub-Signature-256 header.
 *
 * @example
 * ```typescript
 * const provider = new GitHubProvider()
 * const result = await provider.verify(body, headers, process.env.GITHUB_WEBHOOK_SECRET)
 * ```
 */
export class GitHubProvider implements WebhookProvider {
  readonly name = 'github'

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    // GitHub sends signature in X-Hub-Signature-256 header
    const signature = this.getHeader(headers, 'x-hub-signature-256')
    if (!signature) {
      return {
        valid: false,
        error: 'Missing X-Hub-Signature-256 header',
      }
    }

    // Signature format: sha256=<hex>
    if (!signature.startsWith('sha256=')) {
      return {
        valid: false,
        error: 'Invalid signature format (expected sha256=...)',
      }
    }

    const signatureValue = signature.slice(7) // Remove 'sha256=' prefix

    // Compute expected signature
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8')
    const expectedSignature = await computeHmacSha256(payloadStr, secret)

    // Compare signatures
    if (!timingSafeEqual(signatureValue.toLowerCase(), expectedSignature.toLowerCase())) {
      return {
        valid: false,
        error: 'Signature verification failed',
      }
    }

    // Parse payload
    try {
      const event = JSON.parse(payloadStr)
      const eventType = this.getHeader(headers, 'x-github-event')
      const deliveryId = this.getHeader(headers, 'x-github-delivery')

      return {
        valid: true,
        payload: event,
        eventType: eventType ?? undefined,
        webhookId: deliveryId ?? undefined,
      }
    } catch {
      return {
        valid: false,
        error: 'Failed to parse webhook payload',
      }
    }
  }

  parseEventType(payload: unknown): string | undefined {
    if (typeof payload === 'object' && payload !== null && 'action' in payload) {
      return (payload as { action: string }).action
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

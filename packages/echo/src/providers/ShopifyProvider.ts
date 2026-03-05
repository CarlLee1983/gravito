import { computeHmacSha256Base64, timingSafeEqual } from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'
import { BaseProvider } from './base/BaseProvider'

/**
 * Shopify webhook provider.
 *
 * Verifies Shopify webhook signatures using the `X-Shopify-Hmac-Sha256` header.
 * @see {@link https://shopify.dev/docs/apps/webhooks/configuration/https#verify-webhook | Shopify Webhook Verification}
 *
 * @example
 * ```typescript
 * const provider = new ShopifyProvider();
 * const result = await provider.verify(body, headers, process.env.SHOPIFY_WEBHOOK_SECRET);
 * ```
 */
export class ShopifyProvider extends BaseProvider {
  readonly name = 'shopify'

  /**
   * Verifies the Shopify webhook signature.
   *
   * @param payload - Raw request body.
   * @param headers - Request headers.
   * @param secret - Shopify webhook secret.
   * @returns Verification result.
   * @throws Error if signature computation fails.
   */
  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, 'x-shopify-hmac-sha256')
    if (!signature) {
      return this.createFailure('Missing X-Shopify-Hmac-Sha256 header')
    }

    const payloadStr = this.payloadToString(payload)
    const expectedSignature = await computeHmacSha256Base64(payloadStr, secret)

    if (!timingSafeEqual(signature, expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    const parseResult = this.safeParseJson(payloadStr)
    if (parseResult.success === false) {
      return this.createFailure(parseResult.error)
    }

    return this.createSuccess(parseResult.data, {
      eventType: this.getHeader(headers, 'x-shopify-topic'),
      webhookId: this.getHeader(headers, 'x-shopify-webhook-id'),
    })
  }
}

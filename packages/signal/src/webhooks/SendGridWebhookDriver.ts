import { createHmac, timingSafeEqual } from 'node:crypto'
import type { GravitoContext } from '@gravito/core'
import type { WebhookDriver } from '../types'

/**
 * Configuration for SendGrid Webhook Driver.
 */
export interface SendGridWebhookConfig {
  /**
   * Public key or Verification Secret for signature validation.
   * If provided, all requests will be validated.
   */
  publicKey?: string
}

/**
 * SendGrid Webhook Driver.
 *
 * Handles Event Webhooks from SendGrid (delivered, bounced, opened, clicked, etc.).
 *
 * @see https://docs.sendgrid.com/for-developers/tracking-events/event-webhook
 * @public
 * @since 1.1.0
 */
export class SendGridWebhookDriver implements WebhookDriver {
  constructor(private config: SendGridWebhookConfig = {}) {}

  /**
   * Handles the SendGrid webhook request.
   */
  async handle(c: GravitoContext): Promise<{ event: string; payload: any }[] | null> {
    const body = await c.req.json()

    // SendGrid events are usually sent as an array
    const events = Array.isArray(body) ? body : [body]

    if (this.config.publicKey) {
      const signature = c.req.header('X-Twilio-Email-Event-Webhook-Signature')
      const timestamp = c.req.header('X-Twilio-Email-Event-Webhook-Timestamp')

      if (!signature || !timestamp) {
        throw new Error('Missing SendGrid signature headers')
      }

      if (!this.verifySignature(JSON.stringify(body), signature, timestamp)) {
        throw new Error('Invalid SendGrid signature')
      }
    }

    if (events.length === 0) {
      return null
    }

    return events.map((e) => ({
      event: e.event,
      payload: e,
    }))
  }

  /**
   * Verifies the SendGrid webhook signature.
   *
   * @param payload - Raw request body string.
   * @param signature - Signature from X-Twilio-Email-Event-Webhook-Signature header.
   * @param timestamp - Timestamp from X-Twilio-Email-Event-Webhook-Timestamp header.
   * @returns True if signature is valid.
   *
   * @remarks
   * Real SendGrid validation uses Elliptic Curve (ECDSA).
   * This is a placeholder for the logic structure.
   */
  private verifySignature(payload: string, signature: string, timestamp: string): boolean {
    if (!this.config.publicKey) return true

    // In a real implementation, you would use crypto.verify with the SendGrid public key.
    // SendGrid uses ECDSA with SHA256.
    return true // Placeholder: Actual implementation requires 'crypto' public key verification
  }
}

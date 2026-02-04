import type { GravitoContext } from '@gravito/core'
import type { WebhookDriver } from '../types'

/**
 * AWS SES Webhook Driver.
 *
 * Handles SES Notifications via Amazon SNS (Complaints, Bounces, Deliveries).
 *
 * @see https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications.html
 * @public
 * @since 1.1.0
 */
export class SesWebhookDriver implements WebhookDriver {
  /**
   * Handles the AWS SES/SNS webhook request.
   *
   * @param c - The Gravito request context.
   * @returns Array of processed events or null if ignored.
   */
  async handle(c: GravitoContext): Promise<{ event: string; payload: any }[] | null> {
    const body = (await c.req.json()) as any

    // Handle SNS Subscription Confirmation
    if (body.Type === 'SubscriptionConfirmation') {
      // In production, you would visit body.SubscribeURL to confirm
      return [{ event: 'sns:subscription', payload: body }]
    }

    // Handle SNS Notifications
    if (body.Type === 'Notification') {
      const message = typeof body.Message === 'string' ? JSON.parse(body.Message) : body.Message
      const eventType = message.notificationType?.toLowerCase() || 'unknown'

      return [
        {
          event: eventType,
          payload: message,
        },
      ]
    }

    return null
  }
}

import type { Notification } from '../Notification'
import type { Notifiable, NotificationChannel } from '../types'

/**
 * Slack channel configuration.
 */
export interface SlackChannelConfig {
  webhookUrl: string
  defaultChannel?: string
}

/**
 * Slack channel.
 *
 * Sends notifications via a Slack webhook.
 */
export class SlackChannel implements NotificationChannel {
  constructor(private config: SlackChannelConfig) {}

  async send(notification: Notification, notifiable: Notifiable): Promise<void> {
    if (!notification.toSlack) {
      throw new Error('Notification does not implement toSlack method')
    }

    const slackMessage = notification.toSlack(notifiable)

    // Send to Slack webhook.
    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: slackMessage.text,
        channel: slackMessage.channel || this.config.defaultChannel,
        username: slackMessage.username,
        icon_emoji: slackMessage.iconEmoji,
        attachments: slackMessage.attachments,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send Slack notification: ${response.statusText}`)
    }
  }
}

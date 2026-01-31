import type { Notification } from '../Notification'
import type { Notifiable, NotificationChannel } from '../types'
import { TimeoutChannel } from './TimeoutChannel'

/**
 * Slack channel configuration.
 */
export interface SlackChannelConfig {
  webhookUrl: string
  defaultChannel?: string
  /**
   * Timeout 時間（毫秒），預設 30000ms (30秒)。
   */
  timeout?: number
  /**
   * Timeout 發生時的回調函數。
   */
  onTimeout?: (channel: string, notification: Notification) => void
}

/**
 * Slack channel.
 *
 * Sends notifications via a Slack webhook.
 */
export class SlackChannel implements NotificationChannel {
  private timeoutChannel: TimeoutChannel

  constructor(private config: SlackChannelConfig) {
    // 建立內部 channel
    const innerChannel: NotificationChannel = {
      send: async (notification: Notification, notifiable: Notifiable) => {
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
      },
    }

    // 使用 TimeoutChannel 包裝，預設 30 秒
    const timeout = this.config.timeout ?? 30000
    this.timeoutChannel = new TimeoutChannel(innerChannel, {
      timeout,
      onTimeout: this.config.onTimeout,
    })
  }

  async send(notification: Notification, notifiable: Notifiable): Promise<void> {
    return this.timeoutChannel.send(notification, notifiable)
  }
}

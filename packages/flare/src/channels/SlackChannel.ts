import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../types'
import { TimeoutChannel } from './TimeoutChannel'

/**
 * Default timeout duration in milliseconds (30 seconds).
 */
const DEFAULT_TIMEOUT_MS = 30_000

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
    // Create internal channel
    const innerChannel: NotificationChannel = {
      send: async (
        notification: Notification,
        notifiable: Notifiable,
        options?: AbortableSendOptions
      ) => {
        if (!notification.toSlack) {
          throw new Error('Notification does not implement toSlack method')
        }

        const slackMessage = notification.toSlack(notifiable)

        // Send to Slack webhook with AbortSignal support
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
          signal: options?.signal, // Pass AbortSignal to fetch
        })

        if (!response.ok) {
          throw new Error(`Failed to send Slack notification: ${response.statusText}`)
        }
      },
    }

    // Wrap with TimeoutChannel
    const timeout = this.config.timeout ?? DEFAULT_TIMEOUT_MS
    this.timeoutChannel = new TimeoutChannel(innerChannel, {
      timeout,
      onTimeout: this.config.onTimeout,
    })
  }

  async send(
    notification: Notification,
    notifiable: Notifiable,
    options?: AbortableSendOptions
  ): Promise<void> {
    return this.timeoutChannel.send(notification, notifiable, options)
  }
}

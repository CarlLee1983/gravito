import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../types'
import { TimeoutChannel } from './TimeoutChannel'

/**
 * Default timeout duration in milliseconds (30 seconds).
 */
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Mail channel 配置選項。
 */
export interface MailChannelConfig {
  /**
   * Timeout duration in milliseconds. Default: 30000ms (30s).
   */
  timeout?: number
  /**
   * Callback function triggered when a timeout occurs.
   */
  onTimeout?: (channel: string, notification: Notification) => void
}

/**
 * Mail channel.
 *
 * Sends notifications via the mail service.
 */
export class MailChannel implements NotificationChannel {
  private timeoutChannel: TimeoutChannel

  constructor(
    private mailService: {
      send(message: import('../types').MailMessage): Promise<void>
    },
    private config?: MailChannelConfig
  ) {
    // Create internal channel
    const innerChannel: NotificationChannel = {
      send: async (
        notification: Notification,
        notifiable: Notifiable,
        _options?: AbortableSendOptions
      ) => {
        if (!notification.toMail) {
          throw new Error('Notification does not implement toMail method')
        }

        const message = notification.toMail(notifiable)
        // Note: MailService might not support AbortSignal, depending on underlying implementation
        await this.mailService.send(message)
      },
    }

    // Wrap with TimeoutChannel
    const timeout = this.config?.timeout ?? DEFAULT_TIMEOUT_MS
    this.timeoutChannel = new TimeoutChannel(innerChannel, {
      timeout,
      onTimeout: this.config?.onTimeout,
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

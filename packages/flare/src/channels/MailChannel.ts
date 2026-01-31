import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../types'
import { TimeoutChannel } from './TimeoutChannel'

/**
 * 預設 timeout 時間（毫秒）
 */
const DEFAULT_TIMEOUT_MS = 30_000 // 30 秒

/**
 * Mail channel 配置選項。
 */
export interface MailChannelConfig {
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
    // 建立內部 channel
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
        // Note: MailService 可能不支援 AbortSignal，取決於底層實作
        await this.mailService.send(message)
      },
    }

    // 使用 TimeoutChannel 包裝
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

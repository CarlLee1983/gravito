import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../types'
import { TimeoutChannel } from './TimeoutChannel'

/**
 * Default timeout duration in milliseconds (10 seconds).
 */
const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Database channel 配置選項。
 */
export interface DatabaseChannelConfig {
  /**
   * Timeout duration in milliseconds. Default: 10000ms (10s).
   */
  timeout?: number
  /**
   * Callback function triggered when a timeout occurs.
   */
  onTimeout?: (channel: string, notification: Notification) => void
}

/**
 * Database channel.
 *
 * Persists notifications to a database.
 */
export class DatabaseChannel implements NotificationChannel {
  private timeoutChannel: TimeoutChannel

  constructor(
    private dbService: {
      insertNotification(data: {
        notifiableId: string | number
        notifiableType: string
        type: string
        data: Record<string, unknown>
      }): Promise<void>
    },
    private config?: DatabaseChannelConfig
  ) {
    // Create internal channel
    const innerChannel: NotificationChannel = {
      send: async (
        notification: Notification,
        notifiable: Notifiable,
        _options?: AbortableSendOptions
      ) => {
        if (!notification.toDatabase) {
          throw new Error('Notification does not implement toDatabase method')
        }

        const dbNotification = notification.toDatabase(notifiable)

        // Note: Database operations usually do not support AbortSignal
        await this.dbService.insertNotification({
          notifiableId: notifiable.getNotifiableId(),
          notifiableType: notifiable.getNotifiableType?.() || 'user',
          type: dbNotification.type,
          data: dbNotification.data,
        })
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

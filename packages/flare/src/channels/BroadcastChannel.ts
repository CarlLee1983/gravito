import { FlareError } from '../errors/FlareError'
import { FlareErrorCodes } from '../errors/codes'
import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../types'
import { TimeoutChannel } from './TimeoutChannel'

/**
 * Default timeout duration in milliseconds (10 seconds).
 */
const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Broadcast channel 配置選項。
 */
export interface BroadcastChannelConfig {
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
 * Broadcast channel.
 *
 * Sends notifications via a broadcast service.
 */
export class BroadcastChannel implements NotificationChannel {
  private timeoutChannel: TimeoutChannel

  constructor(
    private broadcastService: {
      broadcast(channel: string, event: string, data: Record<string, unknown>): Promise<void>
    },
    private config?: BroadcastChannelConfig
  ) {
    // Create internal channel
    const innerChannel: NotificationChannel = {
      send: async (
        notification: Notification,
        notifiable: Notifiable,
        _options?: AbortableSendOptions
      ) => {
        if (!notification.toBroadcast) {
          throw new FlareError(
            FlareErrorCodes.NOTIFICATION_METHOD_NOT_IMPLEMENTED,
            'Notification does not implement toBroadcast method'
          )
        }

        const broadcastNotification = notification.toBroadcast(notifiable)
        const notifiableId = notifiable.getNotifiableId()
        const notifiableType = notifiable.getNotifiableType?.() || 'user'

        // Broadcast to a private channel.
        const channel = `private-${notifiableType}.${notifiableId}`

        // Note: Broadcast service usually does not support AbortSignal
        await this.broadcastService.broadcast(
          channel,
          broadcastNotification.type,
          broadcastNotification.data
        )
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

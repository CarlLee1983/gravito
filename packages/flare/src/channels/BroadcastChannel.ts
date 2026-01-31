import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../types'

/**
 * Broadcast channel.
 *
 * Sends notifications via a broadcast service.
 */
export class BroadcastChannel implements NotificationChannel {
  constructor(
    private broadcastService: {
      broadcast(channel: string, event: string, data: Record<string, unknown>): Promise<void>
    }
  ) {}

  async send(
    notification: Notification,
    notifiable: Notifiable,
    _options?: AbortableSendOptions
  ): Promise<void> {
    if (!notification.toBroadcast) {
      throw new Error('Notification does not implement toBroadcast method')
    }

    const broadcastNotification = notification.toBroadcast(notifiable)
    const notifiableId = notifiable.getNotifiableId()
    const notifiableType = notifiable.getNotifiableType?.() || 'user'

    // Broadcast to a private channel.
    const channel = `private-${notifiableType}.${notifiableId}`

    // Note: Broadcast service 通常不支援 AbortSignal
    await this.broadcastService.broadcast(
      channel,
      broadcastNotification.type,
      broadcastNotification.data
    )
  }
}

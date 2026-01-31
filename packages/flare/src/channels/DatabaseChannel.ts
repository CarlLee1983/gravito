import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../types'

/**
 * Database channel.
 *
 * Persists notifications to a database.
 */
export class DatabaseChannel implements NotificationChannel {
  constructor(
    private dbService: {
      insertNotification(data: {
        notifiableId: string | number
        notifiableType: string
        type: string
        data: Record<string, unknown>
      }): Promise<void>
    }
  ) {}

  async send(
    notification: Notification,
    notifiable: Notifiable,
    _options?: AbortableSendOptions
  ): Promise<void> {
    if (!notification.toDatabase) {
      throw new Error('Notification does not implement toDatabase method')
    }

    const dbNotification = notification.toDatabase(notifiable)

    // Note: Database operations 通常不支援 AbortSignal
    await this.dbService.insertNotification({
      notifiableId: notifiable.getNotifiableId(),
      notifiableType: notifiable.getNotifiableType?.() || 'user',
      type: dbNotification.type,
      data: dbNotification.data,
    })
  }
}

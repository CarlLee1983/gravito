import type { PlanetCore } from 'gravito-core'
import type { Notification } from './Notification'
import type { Notifiable, NotificationChannel } from './types'

/**
 * Notification manager.
 *
 * Responsible for managing notification channels and delivering notifications.
 */
export class NotificationManager {
  /**
   * Channel registry.
   */
  private channels = new Map<string, NotificationChannel>()

  /**
   * Queue manager (optional, injected by `orbit-queue`).
   */
  private queueManager?:
    | {
        push(
          job: unknown,
          queue?: string | undefined,
          connection?: string | undefined,
          delay?: number | undefined
        ): Promise<void>
      }
    | undefined

  constructor(private core: PlanetCore) {}

  /**
   * Register a notification channel.
   * @param name - Channel name
   * @param channel - Channel instance
   */
  channel(name: string, channel: NotificationChannel): void {
    this.channels.set(name, channel)
  }

  /**
   * Register the queue manager (called by `orbit-queue`).
   */
  setQueueManager(manager: NotificationManager['queueManager']): void {
    this.queueManager = manager
  }

  /**
   * Send a notification.
   *
   * @param notifiable - Recipient
   * @param notification - Notification instance
   *
   * @example
   * ```typescript
   * await notificationManager.send(user, new InvoicePaid(invoice))
   * ```
   */
  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    const channels = notification.via(notifiable)

    // Check whether it should be queued.
    if (notification.shouldQueue() && this.queueManager) {
      const queueConfig = notification.getQueueConfig()

      // Create a queue job.
      const queueJob = {
        type: 'notification',
        notification: notification.constructor.name,
        notifiableId: notifiable.getNotifiableId(),
        notifiableType: notifiable.getNotifiableType?.() || 'user',
        channels,
        notificationData: this.serializeNotification(notification),
        handle: async () => {
          await this.sendNow(notifiable, notification, channels)
        },
      }

      await this.queueManager.push(
        queueJob,
        queueConfig.queue,
        queueConfig.connection,
        queueConfig.delay
      )
      return
    }

    // Send immediately.
    await this.sendNow(notifiable, notification, channels)
  }

  /**
   * Send immediately (without queue).
   */
  private async sendNow(
    notifiable: Notifiable,
    notification: Notification,
    channels: string[]
  ): Promise<void> {
    for (const channelName of channels) {
      const channel = this.channels.get(channelName)
      if (!channel) {
        this.core.logger.warn(`[NotificationManager] Channel '${channelName}' not found, skipping`)
        continue
      }

      try {
        await channel.send(notification, notifiable)
      } catch (error) {
        this.core.logger.error(
          `[NotificationManager] Failed to send notification via '${channelName}':`,
          error
        )
        // Continue with other channels.
      }
    }
  }

  /**
   * Serialize notification (for queuing).
   */
  private serializeNotification(notification: Notification): Record<string, unknown> {
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(notification)) {
      if (!key.startsWith('_') && typeof value !== 'function') {
        data[key] = value
      }
    }
    return data
  }
}

import type { Notifiable } from './types'

/**
 * Marker interface for notifications that should be queued.
 *
 * Implementing this interface will cause the notification to be dispatched
 * to a background queue automatically by the `NotificationManager`.
 *
 * @public
 * @since 3.0.0
 */
export interface ShouldQueue {
  /** The name of the queue to push this notification to. */
  queue?: string | undefined
  /** The connection name (e.g., 'redis', 'database') to use for queuing. */
  connection?: string | undefined
  /** Delay in seconds before the notification is delivered. */
  delay?: number | undefined
}

/**
 * Base Notification class.
 *
 * All application notifications should extend this class.
 *
 * @public
 * @since 3.0.0
 */
export abstract class Notification {
  /**
   * Specify which channels should be used for delivery.
   * @param notifiable - Recipient
   * @returns Channel names
   */
  abstract via(notifiable: Notifiable): string[]

  /**
   * Get mail message (optional).
   * Implement this if the notification will be sent via the mail channel.
   */
  toMail?(_notifiable: Notifiable): import('./types').MailMessage {
    throw new Error('toMail method not implemented')
  }

  /**
   * Get database notification (optional).
   * Implement this if the notification will be stored via the database channel.
   */
  toDatabase?(_notifiable: Notifiable): import('./types').DatabaseNotification {
    throw new Error('toDatabase method not implemented')
  }

  /**
   * Get broadcast notification (optional).
   * Implement this if the notification will be sent via the broadcast channel.
   */
  toBroadcast?(_notifiable: Notifiable): import('./types').BroadcastNotification {
    throw new Error('toBroadcast method not implemented')
  }

  /**
   * Get Slack message (optional).
   * Implement this if the notification will be sent via the Slack channel.
   */
  toSlack?(_notifiable: Notifiable): import('./types').SlackMessage {
    throw new Error('toSlack method not implemented')
  }

  /**
   * Get SMS message (optional).
   * Implement this if the notification will be sent via the SMS channel.
   */
  toSms?(_notifiable: Notifiable): import('./types').SmsMessage {
    throw new Error('toSms method not implemented')
  }

  /**
   * Check whether this notification should be queued.
   */
  shouldQueue(): boolean {
    return 'queue' in this || 'connection' in this || 'delay' in this
  }

  /**
   * Get queue configuration.
   */
  getQueueConfig(): {
    queue?: string | undefined
    connection?: string | undefined
    delay?: number | undefined
  } {
    if (this.shouldQueue()) {
      const queueable = this as unknown as ShouldQueue
      return {
        queue: queueable.queue,
        connection: queueable.connection,
        delay: queueable.delay,
      }
    }
    return {}
  }
}

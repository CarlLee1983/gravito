import type { Notifiable } from './types'

/**
 * Marker interface for notifications that should be queued.
 */
export interface ShouldQueue {
  /**
   * Queue name (optional).
   */
  queue?: string | undefined
  connection?: string | undefined
  delay?: number | undefined
}

/**
 * Base Notification class.
 *
 * All notifications should extend this class.
 * Notifications can be delivered via multiple channels (mail, database, broadcast, Slack, SMS, etc.).
 *
 * @example
 * ```typescript
 * class InvoicePaid extends Notification {
 *   constructor(private invoice: Invoice) {
 *     super()
 *   }
 *
 *   via(user: User): string[] {
 *     return ['mail', 'database']
 *   }
 *
 *   toMail(user: User): MailMessage {
 *     return new MailMessage()
 *       .subject('Invoice Paid')
 *       .view('emails.invoice-paid', { invoice: this.invoice })
 *   }
 *
 *   toDatabase(user: User): DatabaseNotification {
 *     return {
 *       type: 'invoice-paid',
 *       data: { invoice_id: this.invoice.id }
 *     }
 *   }
 * }
 * ```
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

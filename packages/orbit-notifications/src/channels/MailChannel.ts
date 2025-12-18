import type { Notification } from '../Notification'
import type { Notifiable, NotificationChannel } from '../types'

/**
 * Mail channel.
 *
 * Sends notifications via the mail service.
 */
export class MailChannel implements NotificationChannel {
  constructor(
    private mailService: {
      send(message: import('../types').MailMessage): Promise<void>
    }
  ) {}

  async send(notification: Notification, notifiable: Notifiable): Promise<void> {
    if (!notification.toMail) {
      throw new Error('Notification does not implement toMail method')
    }

    const message = notification.toMail(notifiable)
    await this.mailService.send(message)
  }
}

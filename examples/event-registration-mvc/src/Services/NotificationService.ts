import type { OrbitSignal } from '@gravito/signal'
import { RegistrationConfirmed } from '../Mail/RegistrationConfirmed'
import { WaitlistPromoted } from '../Mail/WaitlistPromoted'
import type { Registration } from '../Models/Registration'

export class NotificationService {
  constructor(private mail: OrbitSignal) {}

  /**
   * Send registration confirmation email
   */
  async sendRegistrationConfirmation(registration: Registration): Promise<void> {
    const mailable = new RegistrationConfirmed(registration)
    await this.mail.send(mailable)
  }

  /**
   * Send waitlist promotion notification
   */
  async sendWaitlistPromotion(registration: Registration): Promise<void> {
    const mailable = new WaitlistPromoted(registration)
    await this.mail.send(mailable)
  }

  /**
   * Send registration reminder
   */
  async sendRegistrationReminder(registration: Registration): Promise<void> {
    // TODO: Create reminder email template
    console.log(`Sending reminder email for registration ${registration.id}`)
  }

  /**
   * Send cancellation confirmation
   */
  async sendCancellationConfirmation(registration: Registration): Promise<void> {
    // TODO: Create cancellation email template
    console.log(`Sending cancellation email for registration ${registration.id}`)
  }
}

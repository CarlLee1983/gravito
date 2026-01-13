import { DB } from '@gravito/atlas'
import { Registration, RegistrationStatus } from '../Models/Registration'
import type { RegistrationValue } from '../Models/RegistrationValue'
import { Session } from '../Models/Session'
import type { NotificationService } from './NotificationService'
import type { QrCodeService } from './QrCodeService'

export interface RegistrationData {
  user_id: number
  session_id: number
  field_values?: Record<number, string> // field_id => value
  notes?: string
}

export class RegistrationService {
  constructor(
    private qrCodeService: QrCodeService,
    private notificationService: NotificationService
  ) {}

  /**
   * Create a new registration
   */
  async createRegistration(data: RegistrationData): Promise<Registration> {
    return await DB.transaction(async () => {
      // Get session and check capacity
      const session = await Session.query().where('id', data.session_id).first()

      if (!session) {
        throw new Error('Session not found')
      }

      if (!session.is_active) {
        throw new Error('Session is not active')
      }

      // Determine status based on capacity
      const status = session.isFull() ? RegistrationStatus.WAITLIST : RegistrationStatus.CONFIRMED

      // Generate QR code
      const qrCode = this.qrCodeService.generateQrCodeString()

      // Create registration
      const registration = await Registration.create({
        user_id: data.user_id,
        session_id: data.session_id,
        status,
        qr_code: qrCode,
        notes: data.notes,
        registered_at: new Date(),
        confirmed_at: status === RegistrationStatus.CONFIRMED ? new Date() : undefined,
      })

      // Save custom field values
      if (data.field_values) {
        for (const [fieldId, value] of Object.entries(data.field_values)) {
          await DB.table<RegistrationValue>('registration_values').insert({
            registration_id: registration.id,
            field_id: parseInt(fieldId),
            value,
          })
        }
      }

      // Update registered count if confirmed
      if (status === RegistrationStatus.CONFIRMED) {
        await Session.query().where('id', session.id).increment('registered_count', 1)
      }

      // Load relationships for notification
      await registration.load(['user', 'session.event'])

      // Send confirmation email
      await this.notificationService.sendRegistrationConfirmation(registration)

      return registration
    })
  }

  /**
   * Cancel a registration
   */
  async cancelRegistration(registrationId: number): Promise<void> {
    await DB.transaction(async () => {
      const registration = await DB.table<Registration>('registrations')
        .where('id', registrationId)
        .first()

      if (!registration) {
        throw new Error('Registration not found')
      }

      if (registration.status === RegistrationStatus.CANCELLED) {
        throw new Error('Registration already cancelled')
      }

      // Update status
      await DB.table<Registration>('registrations').where('id', registrationId).update({
        status: RegistrationStatus.CANCELLED,
      })

      // Decrement registered count if was confirmed
      if (registration.status === RegistrationStatus.CONFIRMED) {
        await DB.table<Session>('sessions')
          .where('id', registration.session_id)
          .decrement('registered_count', 1)

        // Check if there's a waitlist registration to promote
        await this.promoteFromWaitlist(registration.session_id)
      }
    })
  }

  /**
   * Check in a registration using QR code
   */
  async checkIn(qrCode: string): Promise<Registration> {
    const registration = await DB.table<Registration>('registrations')
      .where('qr_code', qrCode)
      .first()

    if (!registration) {
      throw new Error('Invalid QR code')
    }

    if (!registration.canCheckIn()) {
      throw new Error('Registration cannot be checked in')
    }

    await DB.table<Registration>('registrations').where('id', registration.id).update({
      status: RegistrationStatus.CHECKED_IN,
      checked_in_at: new Date(),
    })

    return registration
  }

  /**
   * Promote a waitlist registration to confirmed
   */
  private async promoteFromWaitlist(sessionId: number): Promise<void> {
    const waitlistRegistration = await DB.table<Registration>('registrations')
      .where('session_id', sessionId)
      .where('status', RegistrationStatus.WAITLIST)
      .orderBy('registered_at', 'asc')
      .first()

    if (waitlistRegistration) {
      await DB.table<Registration>('registrations').where('id', waitlistRegistration.id).update({
        status: RegistrationStatus.CONFIRMED,
        confirmed_at: new Date(),
      })

      await DB.table<Session>('sessions').where('id', sessionId).increment('registered_count', 1)

      // Send promotion notification
      await this.notificationService.sendWaitlistPromotion(waitlistRegistration)
    }
  }
}

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { Registration } from '../../Models/Registration'
import { RegistrationService } from '../../Services/RegistrationService'
import { Controller } from './Controller'

export class RegistrationController extends Controller {
  /**
   * Create a new registration
   */
  async store(ctx: any) {
    const userId = (ctx as any).session.get('user_id')
    const { session_id, field_values, notes } = (ctx as any).body

    try {
      const registrationService = (ctx.app.make as any)('registrationService')
      await registrationService.createRegistration({
        user_id: userId,
        session_id: parseInt(session_id),
        field_values,
        notes,
      })

      return (ctx as any).redirect('/profile').with('success', 'Registration successful!')
    } catch (error: any) {
      return (ctx as any).back().with('error', error.message)
    }
  }

  /**
   * Cancel a registration
   */
  async destroy(ctx: any) {
    const userId = (ctx as any).session.get('user_id')
    const registrationId = parseInt((ctx as any).params.id)

    try {
      const registration = await DB.table<Registration>('registrations')
        .where('id', registrationId)
        .where('user_id', userId)
        .first()

      if (!registration) {
        return (ctx as any).back().with('error', 'Registration not found')
      }

      const registrationService = (ctx.app.make as any)('registrationService')
      await registrationService.cancelRegistration(registrationId)

      return (ctx as any).back().with('success', 'Registration cancelled')
    } catch (error: any) {
      return (ctx as any).back().with('error', error.message)
    }
  }
}

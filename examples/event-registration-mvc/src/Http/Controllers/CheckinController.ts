import { DB } from '@gravito/atlas'
import type { Registration } from '../../Models/Registration'
import { Controller } from './Controller'

export class CheckinController extends Controller {
  /**
   * Show QR code scanner page
   */
  async index(ctx: any) {
    return ctx.inertia('Checkin/Scanner')
  }

  /**
   * Verify QR code and return registration info
   */
  async verify(ctx: any) {
    const { qr_code } = (ctx as any).get('data')

    const registration = await DB.table<Registration>('registrations')
      .where('qr_code', qr_code)
      .with('user')
      .with('session.event')
      .first()

    if (!registration) {
      return ctx.json({ error: 'Registration not found' }, 404)
    }

    return ctx.json({ registration })
  }

  /**
   * Perform check-in
   */
  async checkin(ctx: any) {
    const qrCode = (ctx as any).params.qrCode

    try {
      const registrationService = (ctx.app.make as any)('registrationService')
      const registration = await registrationService.checkIn(qrCode)

      return ctx.json({
        message: 'Checked in successfully',
        registration,
      })
    } catch (error: any) {
      return ctx.json({ error: error.message }, 400)
    }
  }
}

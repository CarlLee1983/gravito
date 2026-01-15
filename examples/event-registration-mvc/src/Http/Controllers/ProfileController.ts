import { DB } from '@gravito/atlas'
import type { Registration } from '../../Models/Registration'
import { QrCodeService } from '../../Services/QrCodeService'
import { Controller } from './Controller'

export class ProfileController extends Controller {
  /**
   * Display user's registrations
   */
  async index(ctx: any) {
    const userId = ctx.session.get('user_id')

    const registrations = await DB.table<Registration>('registrations')
      .where('user_id', userId)
      .with(['session.event', 'values.field'])
      .orderBy('registered_at', 'desc')
      .get()

    return ctx.inertia('Profile/Index', {
      registrations,
    })
  }

  /**
   * Display registration details with QR code
   */
  async showRegistration(ctx: any) {
    const userId = ctx.session.get('user_id')
    const registrationId = parseInt(ctx.params.id, 10)

    const registration = await DB.table<Registration>('registrations')
      .where('id', registrationId)
      .where('user_id', userId)
      .with(['session.event', 'values.field'])
      .first()

    if (!registration) {
      return ctx.redirect('/profile')
    }

    // Generate QR code data URL
    const qrCodeService = new QrCodeService()
    const qrCodeDataUrl = await qrCodeService.generateQrCodeDataUrl(registration.qr_code)

    return ctx.inertia('Profile/Registration', {
      registration,
      qrCodeDataUrl,
    })
  }
}

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import { type Registration, RegistrationStatus } from '../../../Models/Registration'
import { NotificationService } from '../../../Services/NotificationService'
import { Controller } from '../Controller'

export class RegistrationController extends Controller {
  async index(ctx: any) {
    const { event_id, session_id, status } = ctx.query

    let query = DB.table<Registration>('registrations').with([
      'user',
      'session.event',
      'values.field',
    ])

    if (event_id) {
      query = (query as any).whereHas('session', (q: any) => q.where('event_id', event_id))
    }

    if (session_id) {
      query = query.where('session_id', session_id)
    }

    if (status) {
      query = query.where('status', status)
    }

    const registrations = await query.orderBy('registered_at', 'desc').get()

    return ctx.inertia('Admin/Registrations/Index', { registrations })
  }

  async show(ctx: any) {
    const registrationId = parseInt(ctx.params.id)

    const registration = await DB.table<Registration>('registrations')
      .where('id', registrationId)
      .with(['user', 'session.event', 'values.field'])
      .first()

    if (!registration) {
      return ctx.redirect('/admin/registrations')
    }

    return ctx.inertia('Admin/Registrations/Show', { registration })
  }

  async updateStatus(ctx: any) {
    const registrationId = parseInt(ctx.params.id)
    const { status } = ctx.get('data') as any

    await DB.table<Registration>('registrations').where('id', registrationId).update({ status })

    return ctx.json({ success: true })
  }

  async resendEmail(ctx: any) {
    const registrationId = parseInt(ctx.params.id)

    const registration = await DB.table<Registration>('registrations')
      .where('id', registrationId)
      .first()

    if (!registration) {
      return ctx.json({ error: 'Registration not found' }, 404)
    }

    const notificationService = (ctx.app.make as any as any)('notificationService')
    await notificationService.sendRegistrationConfirmation(registration)

    return ctx.json({ success: true, message: 'Email sent' })
  }

  async export(ctx: any) {
    // TODO: Implement CSV export
    return ctx.json({ message: 'Export functionality coming soon' })
  }
}

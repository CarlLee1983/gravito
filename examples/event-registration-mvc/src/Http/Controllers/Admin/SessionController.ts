import { DB } from '@gravito/atlas'
import type { Session } from '../../../Models/Session'
import { Controller } from '../Controller'

export class SessionController extends Controller {
  async index(ctx: any) {
    const eventId = parseInt(ctx.params.eventId, 10)
    const event = await DB.table<any>('events').where('id', eventId).first()

    const sessions = await DB.table<Session>('sessions')
      .where('event_id', eventId)
      .orderBy('start_time', 'asc')
      .get()

    return ctx.inertia('Admin/Sessions/Index', { event, sessions })
  }

  async store(ctx: any) {
    const eventId = parseInt(ctx.params.eventId, 10)
    const data = ctx.get('data') as any

    await DB.table<Session>('sessions').insert({
      event_id: eventId,
      title: data.title,
      start_time: new Date(data.start_time),
      end_time: new Date(data.end_time),
      capacity: parseInt(data.capacity, 10),
      is_active: data.is_active !== false,
      registered_count: 0,
    })

    return ctx
      .redirect(`/admin/events/${eventId}/sessions`)
      .with('success', 'Session created successfully')
  }

  async update(ctx: any) {
    const sessionId = parseInt(ctx.params.id, 10)
    const data = ctx.get('data') as any

    const session = await DB.table<Session>('sessions').where('id', sessionId).first()
    if (!session) {
      return ctx.redirect('/admin').with('error', 'Session not found')
    }

    await DB.table<Session>('sessions')
      .where('id', sessionId)
      .update({
        title: data.title,
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
        capacity: parseInt(data.capacity, 10),
        is_active: data.is_active,
      })

    return ctx
      .redirect(`/admin/events/${session.event_id}/sessions`)
      .with('success', 'Session updated successfully')
  }

  async destroy(ctx: any) {
    const sessionId = parseInt(ctx.params.id, 10)
    const session = await DB.table<Session>('sessions').where('id', sessionId).first()

    if (session) {
      await DB.table<Session>('sessions').where('id', sessionId).delete()
      return ctx
        .redirect(`/admin/events/${session.event_id}/sessions`)
        .with('success', 'Session deleted successfully')
    }

    return ctx.redirect('/admin').with('error', 'Session not found')
  }
}

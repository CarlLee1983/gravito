import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { Session } from '../../../Models/Session'
import { Controller } from '../Controller'

export class SessionController extends Controller {
  async index(ctx: any) {
    const eventId = parseInt(ctx.params.eventId)

    const sessions = await DB.table<Session>('sessions')
      .where('event_id', eventId)
      .orderBy('start_time', 'asc')
      .get()

    return ctx.json({ sessions })
  }

  async store(ctx: any) {
    const eventId = parseInt(ctx.params.eventId)
    const data = ctx.get('data') as any

    const session = await DB.table<Session>('sessions').insert({
      event_id: eventId,
      title: data.title,
      start_time: new Date(data.start_time),
      end_time: new Date(data.end_time),
      capacity: parseInt(data.capacity),
      is_active: data.is_active !== false,
    })

    return ctx.json({ session })
  }

  async update(ctx: any) {
    const sessionId = parseInt(ctx.params.id)
    const data = ctx.get('data') as any

    await DB.table<Session>('sessions')
      .where('id', sessionId)
      .update({
        title: data.title,
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
        capacity: parseInt(data.capacity),
        is_active: data.is_active,
      })

    return ctx.json({ success: true })
  }

  async destroy(ctx: any) {
    const sessionId = parseInt(ctx.params.id)
    await DB.table<Session>('sessions').where('id', sessionId).delete()

    return ctx.json({ success: true })
  }
}

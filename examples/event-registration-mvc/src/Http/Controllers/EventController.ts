import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import { type Event, EventStatus } from '../../Models/Event'
import { Controller } from './Controller'

export class EventController extends Controller {
  /**
   * Display list of published events
   */
  async index(ctx: any) {
    const events = await DB.table<Event>('events')
      .where('status', EventStatus.PUBLISHED)
      .orderBy('registration_start', 'desc')
      .get()

    return ctx.inertia('Events/Index', {
      events,
    })
  }

  /**
   * Display event details with sessions
   */
  async show(ctx: any) {
    const eventId = parseInt(ctx.params.id)

    const event = await DB.table<Event>('events')
      .where('id', eventId)
      .where('status', EventStatus.PUBLISHED)
      .with(['sessions', 'fields'])
      .first()

    if (!event) {
      return ctx.redirect('/events')
    }

    return ctx.inertia('Events/Show', {
      event,
    })
  }
}

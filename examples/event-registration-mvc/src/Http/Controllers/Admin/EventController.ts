import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import { type Event, EventStatus } from '../../../Models/Event'
import { Controller } from '../Controller'

export class EventController extends Controller {
  async index(ctx: any) {
    const events = await DB.table<Event>('events').orderBy('created_at', 'desc').get()

    return ctx.inertia('Admin/Events/Index', { events })
  }

  async create(ctx: any) {
    return ctx.inertia('Admin/Events/Create')
  }

  async store(ctx: any) {
    const data = ctx.get('data') as any

    const event = await DB.table<Event>('events').insert({
      title: data.title,
      description: data.description,
      location: data.location,
      image_url: data.image_url,
      status: data.status || EventStatus.DRAFT,
      registration_start: new Date(data.registration_start),
      registration_end: new Date(data.registration_end),
    })

    return ctx.redirect('/admin/events').with('success', 'Event created successfully')
  }

  async edit(ctx: any) {
    const eventId = parseInt(ctx.params.id)
    const event = await DB.table<Event>('events').where('id', eventId).first()

    if (!event) {
      return ctx.redirect('/admin/events')
    }

    return ctx.inertia('Admin/Events/Edit', { event })
  }

  async update(ctx: any) {
    const eventId = parseInt(ctx.params.id)
    const data = ctx.get('data') as any

    await DB.table<Event>('events')
      .where('id', eventId)
      .update({
        title: data.title,
        description: data.description,
        location: data.location,
        image_url: data.image_url,
        status: data.status,
        registration_start: new Date(data.registration_start),
        registration_end: new Date(data.registration_end),
      })

    return ctx.redirect('/admin/events').with('success', 'Event updated successfully')
  }

  async destroy(ctx: any) {
    const eventId = parseInt(ctx.params.id)
    await DB.table<Event>('events').where('id', eventId).delete()

    return ctx.redirect('/admin/events').with('success', 'Event deleted successfully')
  }
}

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { RegistrationField } from '../../../Models/RegistrationField'
import { Controller } from '../Controller'

export class FieldController extends Controller {
  async index(ctx: any) {
    const eventId = parseInt(ctx.params.eventId)

    const fields = await DB.table<RegistrationField>('registration_fields')
      .where('event_id', eventId)
      .orderBy('sort_order', 'asc')
      .get()

    return ctx.json({ fields })
  }

  async store(ctx: any) {
    const eventId = parseInt(ctx.params.eventId)
    const data = ctx.get('data') as any

    // Get max sort order
    const maxOrder = await DB.table<RegistrationField>('registration_fields')
      .where('event_id', eventId)
      .max('sort_order')

    const field = await DB.table<RegistrationField>('registration_fields').insert({
      event_id: eventId,
      name: data.name,
      label: data.label,
      type: data.type,
      options: (data.options ? JSON.stringify(data.options) : undefined) as any,
      required: data.required || false,
      sort_order: (maxOrder || 0) + 1,
    })

    return ctx.json({ field })
  }

  async update(ctx: any) {
    const fieldId = parseInt(ctx.params.id)
    const data = ctx.get('data') as any

    await DB.table<RegistrationField>('registration_fields')
      .where('id', fieldId)
      .update({
        name: data.name,
        label: data.label,
        type: data.type,
        options: (data.options ? JSON.stringify(data.options) : undefined) as any,
        required: data.required,
      })

    return ctx.json({ success: true })
  }

  async destroy(ctx: any) {
    const fieldId = parseInt(ctx.params.id)
    await DB.table<RegistrationField>('registration_fields').where('id', fieldId).delete()

    return ctx.json({ success: true })
  }

  async reorder(ctx: any) {
    const { field_orders } = ctx.get('data') as any // Array of { id, sort_order }

    for (const item of field_orders) {
      await DB.table<RegistrationField>('registration_fields')
        .where('id', item.id)
        .update({ sort_order: item.sort_order })
    }

    return ctx.json({ success: true })
  }
}

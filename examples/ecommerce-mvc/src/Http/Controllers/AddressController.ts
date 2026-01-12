import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import { Address } from '../../Models/Address'

export class AddressController {
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const user = ctx.get('user') as any
    if (!user) return ctx.redirect('/login')

    const addresses = await Address.where('user_id', user.id).orderBy('is_default', 'desc').get()

    return inertia.render('Account/Addresses', {
      addresses: addresses.map((a: Address) => ({
        ...a.toJSON(),
        formatted_address: a.formattedAddress,
      })),
    })
  }

  static async store(ctx: GravitoContext) {
    const user = ctx.get('user') as any
    if (!user) return ctx.redirect('/login')

    const body = await (ctx as any).req.json()

    // Simple validation
    if (!body.name || !body.phone || !body.city || !body.district || !body.street) {
      return ctx.redirect('/account/addresses') // Should handle error
    }

    const address = new Address()
    address.user_id = user.id
    address.name = body.name
    address.phone = body.phone
    address.city = body.city
    address.district = body.district
    address.street = body.street
    address.zip_code = body.zip_code || ''
    address.is_default = body.is_default || false
    address.created_at = new Date()
    address.updated_at = new Date()

    if (address.is_default) {
      // Unset other defaults
      // Note: Ideal would be a transaction, but simple query for now
      const others = await Address.where('user_id', user.id).get()
      for (const other of others) {
        other.is_default = false
        await other.save()
      }
    }

    await address.save()

    return ctx.redirect('/account/addresses')
  }

  static async update(ctx: GravitoContext) {
    // TODO: Implement update
    return ctx.redirect('/account/addresses')
  }

  static async destroy(ctx: GravitoContext) {
    const user = ctx.get('user') as any
    if (!user) return ctx.redirect('/login')

    const id = (ctx as any).req.param('id')
    const address = await Address.find(id)

    if (address && address.user_id === user.id) {
      await address.delete()
    }

    return ctx.redirect('/account/addresses')
  }

  static async setDefault(ctx: GravitoContext) {
    const user = ctx.get('user') as any
    if (!user) return ctx.redirect('/login')

    const id = (ctx as any).req.param('id')
    const address = await Address.find(id)

    if (address && address.user_id === user.id) {
      // Unset all others
      const others = await Address.where('user_id', user.id).get()
      for (const other of others) {
        other.is_default = false
        await other.save()
      }

      address.is_default = true
      await address.save()
    }

    return ctx.redirect('/account/addresses')
  }
}

import type { ConnectionContract } from '@gravito/atlas'
import { DB } from '@gravito/atlas'
import type { ICartRepository } from '../../../Domain/Contracts/ICartRepository'
import { Cart } from '../../../Domain/Entities/Cart'
import { CartItem } from '../../../Domain/Entities/CartItem'

export class AtlasCartRepository implements ICartRepository {
  async find(id: { memberId?: string; guestId?: string }): Promise<Cart | null> {
    const query = DB.table('carts')

    if (id.memberId) {
      query.where('member_id', id.memberId)
    } else if (id.guestId) {
      query.where('guest_id', id.guestId)
    } else {
      return null
    }

    const rawCart = (await query.first()) as any
    if (!rawCart) {
      return null
    }

    return this.hydrateCart(rawCart)
  }

  async findById(id: string): Promise<Cart | null> {
    const rawCart = (await DB.table('carts').where('id', id).first()) as any
    if (!rawCart) {
      return null
    }

    return this.hydrateCart(rawCart)
  }

  async save(cart: Cart): Promise<void> {
    await DB.transaction(async (db: ConnectionContract) => {
      const exists = await db.table('carts').where('id', cart.id).exists()

      if (exists) {
        await db.table('carts').where('id', cart.id).update({
          member_id: cart.memberId,
          guest_id: cart.guestId,
          last_activity_at: new Date(),
        })
      } else {
        await db.table('carts').insert({
          id: cart.id,
          member_id: cart.memberId,
          guest_id: cart.guestId,
          created_at: new Date(),
          last_activity_at: new Date(),
        })
      }

      await db.table('cart_items').where('cart_id', cart.id).delete()
      for (const item of cart.items) {
        await db.table('cart_items').insert({
          id: item.id,
          cart_id: cart.id,
          variant_id: item.variantId,
          quantity: item.quantity,
        })
      }
    })
  }

  async delete(id: string): Promise<void> {
    await DB.transaction(async (db: ConnectionContract) => {
      await db.table('cart_items').where('cart_id', id).delete()
      await db.table('carts').where('id', id).delete()
    })
  }

  private async hydrateCart(rawCart: any): Promise<Cart> {
    const cart = Cart.create(rawCart.id, rawCart.member_id, rawCart.guest_id)

    const rawItems = (await DB.table('cart_items').where('cart_id', rawCart.id).get()) as any[]
    const items = rawItems.map(
      (rawItem) =>
        new CartItem(rawItem.id, {
          variantId: rawItem.variant_id,
          quantity: rawItem.quantity,
        })
    )

    // 使用受保護方法注入持久化數據
    ;(cart as any).hydrateItems(items)

    return cart
  }
}

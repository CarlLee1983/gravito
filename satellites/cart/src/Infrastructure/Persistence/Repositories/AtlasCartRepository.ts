import type { ConnectionContract } from '@gravito/atlas'
import { DB } from '@gravito/atlas'
import type { ICartRepository } from '../../../Domain/Contracts/ICartRepository'
import { Cart, CartItem } from '../../../Domain/Entities/Cart'

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

    const cart = Cart.create(rawCart.id, rawCart.member_id, rawCart.guest_id)

    // 關鍵：使用 _hydrateItem 注入持久化數據
    const rawItems = (await DB.table('cart_items').where('cart_id', rawCart.id).get()) as any[]
    for (const rawItem of rawItems) {
      cart._hydrateItem(
        new CartItem(rawItem.id, {
          variantId: rawItem.variant_id,
          quantity: rawItem.quantity,
        })
      )
    }

    return cart
  }

  async save(cart: Cart): Promise<void> {
    await DB.transaction(async (db: ConnectionContract) => {
      const exists = await db.table('carts').where('id', cart.id).exists()

      if (exists) {
        await db.table('carts').where('id', cart.id).update({
          member_id: cart.memberId,
          guest_id: cart.guestId, // 更新時也要同步 guest_id (用於轉正)
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
          variant_id: item.props.variantId,
          quantity: item.props.quantity,
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
}

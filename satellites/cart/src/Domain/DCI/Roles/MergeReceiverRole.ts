import type { Cart } from '../../Entities/Cart'
import type { CartItem } from '../../Entities/CartItem'

/**
 * 購物車接收者角色
 * 用於購物車合併時，接收合併商品的購物車扮演此角色
 */
export interface MergeReceiver {
  /**
   * 接收並合併其他購物車的商品
   */
  receiveItems(items: CartItem[]): void
}

/**
 * 為購物車注入 MergeReceiver 角色
 */
export function injectMergeReceiver(cart: Cart): MergeReceiver {
  return {
    receiveItems(items: CartItem[]): void {
      for (const item of items) {
        cart.addItem(item.variantId, item.quantity)
      }
    },
  }
}

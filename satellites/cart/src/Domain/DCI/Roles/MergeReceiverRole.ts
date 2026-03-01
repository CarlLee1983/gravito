import type { Cart } from '../../Entities/Cart'
import { CartItem } from '../../Entities/CartItem'

/**
 * 購物車接收者角色
 * DCI 模式：包含合併邏輯，接收並整合其他購物車的商品
 */
export interface MergeReceiver {
  /**
   * 接收並合併其他購物車的商品
   * 如果商品已存在，則增加數量；否則新增商品
   */
  receiveItems(items: CartItem[]): void
}

/**
 * 為購物車注入 MergeReceiver 角色
 * DCI 模式：角色包含合併業務邏輯
 */
export function injectMergeReceiver(cart: Cart): MergeReceiver {
  return {
    receiveItems(items: CartItem[]): void {
      const currentItems = [...cart.items]

      for (const item of items) {
        const existingIndex = currentItems.findIndex((i) => i.variantId === item.variantId)

        if (existingIndex >= 0) {
          const existing = currentItems[existingIndex]
          const updated = existing.withQuantity(existing.quantity + item.quantity)
          currentItems[existingIndex] = updated
        } else {
          currentItems.push(CartItem.create(crypto.randomUUID(), item.variantId, item.quantity))
        }
      }

      cart.setItems(currentItems)
    },
  }
}

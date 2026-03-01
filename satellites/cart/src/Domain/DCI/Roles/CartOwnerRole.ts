import type { Cart } from '../../Entities/Cart'
import { CartItem } from '../../Entities/CartItem'
import { CartError } from '../../Errors'

/**
 * 購物車擁有者角色
 * DCI 模式：包含實際的業務邏輯（新增、移除、更新、清空）
 */
export interface CartOwner {
  /**
   * 新增或增加商品數量
   */
  addItem(variantId: string, quantity: number): void

  /**
   * 移除購物車中的商品
   */
  removeItem(variantId: string): void

  /**
   * 更新購物車中商品的數量
   */
  updateItemQuantity(variantId: string, newQuantity: number): void

  /**
   * 清空購物車所有商品
   */
  clear(): void
}

/**
 * 為購物車注入 CartOwner 角色
 * DCI 模式：角色包含業務邏輯，不只是代理
 */
export function injectCartOwner(cart: Cart): CartOwner {
  return {
    addItem(variantId: string, quantity: number): void {
      const items = [...cart.items]
      const existingIndex = items.findIndex((i) => i.variantId === variantId)

      if (existingIndex >= 0) {
        const existing = items[existingIndex]
        const updated = existing.withQuantity(existing.quantity + quantity)
        items[existingIndex] = updated
      } else {
        items.push(CartItem.create(crypto.randomUUID(), variantId, quantity))
      }

      cart.setItems(items)
    },

    removeItem(variantId: string): void {
      const items = cart.items.filter((i) => i.variantId !== variantId)
      cart.setItems(items)
    },

    updateItemQuantity(variantId: string, newQuantity: number): void {
      const items = [...cart.items]
      const existingIndex = items.findIndex((i) => i.variantId === variantId)

      if (existingIndex >= 0) {
        const existing = items[existingIndex]
        const updated = existing.withQuantity(newQuantity)
        items[existingIndex] = updated
        cart.setItems(items)
      } else {
        throw CartError.itemNotFound()
      }
    },

    clear(): void {
      cart.setItems([])
    },
  }
}

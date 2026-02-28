import type { Cart } from '../../Entities/Cart'

/**
 * 購物車擁有者角色
 * 定義購物車擁有者可執行的操作
 */
export interface CartOwner {
  /**
   * 新增商品到購物車
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
 * 使用 DCI 模式：角色只是介面包裝，邏輯由 Entity 提供
 */
export function injectCartOwner(cart: Cart): CartOwner {
  return {
    addItem(variantId: string, quantity: number): void {
      cart.addItem(variantId, quantity)
    },
    removeItem(variantId: string): void {
      cart.removeItem(variantId)
    },
    updateItemQuantity(variantId: string, newQuantity: number): void {
      cart.updateItemQuantity(variantId, newQuantity)
    },
    clear(): void {
      cart.clear()
    },
  }
}

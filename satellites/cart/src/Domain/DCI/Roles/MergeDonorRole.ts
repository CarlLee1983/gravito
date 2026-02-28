import type { Cart } from '../../Entities/Cart'
import type { CartItem } from '../../Entities/CartItem'

/**
 * 購物車捐獻者角色
 * 用於購物車合併時，被合併的購物車扮演此角色
 */
export interface MergeDonor {
  /**
   * 取得待合併的商品列表
   */
  getItemsForMerge(): CartItem[]
}

/**
 * 為購物車注入 MergeDonor 角色
 */
export function injectMergeDonor(cart: Cart): MergeDonor {
  return {
    getItemsForMerge(): CartItem[] {
      return cart.items
    },
  }
}

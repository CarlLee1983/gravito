/**
 * PurchaserRole - 購買者角色
 *
 * 職責：驗證商品的可購買性
 * - 檢查商品狀態（必須 ACTIVE）
 * - 檢查庫存是否充足
 * - 檢查購買數量是否合法
 *
 * 使用 Closures Pattern：注入 Product entity，回傳包含行為的閉包物件
 */

import { FlashSaleError, FlashSaleErrorCode } from '../../../Application/Errors/FlashSaleError'
import type { Product } from '../../Entities/Product'
import { ProductStatus } from '../../Models'

/** 購買數量上限 */
const MAX_PURCHASE_QUANTITY = 1000

/**
 * PurchaserRole 回傳的行為介面
 */
export interface Purchaser {
  /** 檢查是否可購買（不拋錯，回傳 boolean） */
  canPurchase(quantity: number): boolean
  /** 驗證可購買性（驗證失敗拋出 FlashSaleError） */
  validatePurchase(quantity: number): void
}

/**
 * 注入 Purchaser 角色
 *
 * @param product - 商品實體
 * @returns 包含購買驗證行為的閉包物件
 */
export function injectPurchaser(product: Product): Purchaser {
  return {
    canPurchase(quantity: number): boolean {
      if (product.status !== ProductStatus.ACTIVE) {
        return false
      }
      if (quantity <= 0 || quantity > MAX_PURCHASE_QUANTITY) {
        return false
      }
      return product.stock.isEnoughFor(quantity)
    },

    validatePurchase(quantity: number): void {
      // 驗證數量合法性
      if (quantity <= 0 || quantity > MAX_PURCHASE_QUANTITY) {
        throw new FlashSaleError(
          `Invalid purchase quantity: ${quantity}`,
          FlashSaleErrorCode.INVALID_QUANTITY,
          400
        )
      }

      // 驗證商品狀態
      if (product.status !== ProductStatus.ACTIVE) {
        throw FlashSaleError.productInactive(product.id)
      }

      // 驗證庫存
      if (!product.stock.isEnoughFor(quantity)) {
        throw FlashSaleError.insufficientStock(product.stock.quantity, quantity)
      }
    },
  }
}

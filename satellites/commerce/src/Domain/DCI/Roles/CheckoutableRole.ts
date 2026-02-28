import { CommerceError } from '../../../Application/Errors/CommerceError'
import type { Order } from '../../Entities/Order'
import type { Adjustment } from '../../ValueObjects/Adjustment'
import type { LineItem } from '../../ValueObjects/LineItem'

/**
 * 可結帳角色
 *
 * 提供訂單結帳驗證邏輯
 */
export interface CheckoutableRole {
  /**
   * 驗證訂單項目是否有效
   */
  validateItems(items: LineItem[]): void

  /**
   * 驗證並應用調整項目
   */
  applyAdjustments(adjustments: Adjustment[]): void
}

/**
 * 注入 CheckoutableRole 到 Order
 */
export function injectCheckoutableRole(_order: Order): CheckoutableRole {
  return {
    validateItems(items: LineItem[]): void {
      if (!items || items.length === 0) {
        throw CommerceError.invalidCheckout('訂單必須至少有一項商品')
      }

      for (const item of items) {
        if (item.quantity <= 0) {
          throw CommerceError.invalidCheckout(`商品 ${item.name} 的數量必須大於 0`)
        }

        if (item.unitPrice.amountInCents < 0) {
          throw CommerceError.invalidCheckout(`商品 ${item.name} 的單價不能為負數`)
        }
      }
    },

    applyAdjustments(adjustments: Adjustment[]): void {
      for (const adjustment of adjustments) {
        if (adjustment.amount.amountInCents === 0) {
          throw CommerceError.invalidCheckout(`調整項目 ${adjustment.label} 金額不能為 0`)
        }
      }
    },
  }
}

import { CommerceError } from '../../../Application/Errors/CommerceError'
import type { Order } from '../../Entities/Order'
import { OrderStatus } from '../../Entities/Order'

/**
 * 訂單處理器角色
 *
 * 提供訂單狀態轉移和支付確認邏輯
 */
export interface OrderProcessorRole {
  /**
   * 確認訂單已付款
   */
  confirmPayment(): void

  /**
   * 標記為處理中
   */
  markAsProcessing(): void

  /**
   * 標記為已出貨
   */
  markAsShipped(): void

  /**
   * 標記為已完成
   */
  markAsCompleted(): void
}

/**
 * 注入 OrderProcessorRole 到 Order
 */
export function injectOrderProcessorRole(order: Order): OrderProcessorRole {
  return {
    confirmPayment(): void {
      if (order.status !== OrderStatus.PENDING) {
        throw CommerceError.invalidStatusTransition(order.status, OrderStatus.PAID)
      }
      order.markAsPaid()
    },

    markAsProcessing(): void {
      if (order.status !== OrderStatus.PAID) {
        throw CommerceError.invalidStatusTransition(order.status, OrderStatus.PROCESSING)
      }
      order.markAsProcessing()
    },

    markAsShipped(): void {
      if (order.status !== OrderStatus.PROCESSING) {
        throw CommerceError.invalidStatusTransition(order.status, OrderStatus.SHIPPED)
      }
      order.markAsShipped()
    },

    markAsCompleted(): void {
      if (order.status !== OrderStatus.SHIPPED) {
        throw CommerceError.invalidStatusTransition(order.status, OrderStatus.COMPLETED)
      }
      order.markAsCompleted()
    },
  }
}

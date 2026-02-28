import { CommerceError } from '../../../Application/Errors/CommerceError'
import type { Order } from '../../Entities/Order'
import { OrderStatus } from '../../Entities/Order'

/**
 * 可退款角色
 *
 * 提供退款邏輯
 */
export interface RefundableRole {
  /**
   * 申請退款
   */
  requestRefund(): void

  /**
   * 批准退款（標記為已退款）
   */
  approveRefund(): void
}

/**
 * 注入 RefundableRole 到 Order
 */
export function injectRefundableRole(order: Order): RefundableRole {
  return {
    requestRefund(): void {
      const allowedStatuses = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.COMPLETED]
      if (!allowedStatuses.includes(order.status)) {
        throw CommerceError.invalidStatusTransition(order.status, OrderStatus.REQUESTED_REFUND)
      }
      order.requestRefund()
    },

    approveRefund(): void {
      if (order.status !== OrderStatus.REQUESTED_REFUND) {
        throw CommerceError.invalidStatusTransition(order.status, OrderStatus.REFUNDED)
      }
      order.markAsRefunded()
    },
  }
}

import type { PlanetCore } from '@gravito/core'
import { CommerceError } from '../../../Application/Errors/CommerceError'
import type { IOrderRepository } from '../../Contracts/IOrderRepository'
import { injectRefundableRole } from '../Roles/RefundableRole'

/**
 * 退款場景的輸入參數
 */
export interface RefundInput {
  orderId: string
  action: 'request' | 'approve'
  reason?: string
}

/**
 * 退款場景協調器
 *
 * 管理訂單的退款流程
 */
export class RefundContext {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 執行退款操作
   */
  async execute(input: RefundInput): Promise<void> {
    // 1. 載入訂單
    const order = await this.orderRepository.findById(input.orderId)
    if (!order) {
      throw CommerceError.orderNotFound(input.orderId)
    }

    // 2. 注入可退款角色
    const refundable = injectRefundableRole(order)

    // 3. 執行操作
    switch (input.action) {
      case 'request':
        refundable.requestRefund()
        // 觸發退款申請事件
        await this.core.hooks.doAction('commerce:order-refund-requested', {
          orderId: order.id,
          memberId: order.memberId,
          totalAmount: order.total.value,
          reason: input.reason,
        })
        break
      case 'approve':
        refundable.approveRefund()
        // 觸發退款已批准事件
        await this.core.hooks.doAction('commerce:order-refunded', {
          orderId: order.id,
          memberId: order.memberId,
          totalAmount: order.total.value,
        })
        break
    }

    // 4. 保存訂單
    await this.orderRepository.save(order)
  }
}

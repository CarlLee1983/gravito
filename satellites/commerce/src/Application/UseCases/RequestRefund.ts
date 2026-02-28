import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import { RefundContext } from '../../Domain/DCI/Contexts/RefundContext'

/**
 * RequestRefund UseCase 輸入
 */
export interface RequestRefundInput {
  orderId: string
  reason?: string
}

/**
 * RequestRefund UseCase 輸出
 */
export interface RequestRefundOutput {
  orderId: string
  status: string
}

/**
 * RequestRefund UseCase
 *
 * 申請退款（標記為 REQUESTED_REFUND 狀態）
 */
export class RequestRefund extends UseCase<RequestRefundInput, RequestRefundOutput> {
  constructor(
    private core: PlanetCore,
    private orderRepository: IOrderRepository
  ) {
    super()
  }

  async execute(input: RequestRefundInput): Promise<RequestRefundOutput> {
    const context = new RefundContext(this.orderRepository, this.core)
    await context.execute({
      orderId: input.orderId,
      action: 'request',
      reason: input.reason,
    })

    const order = await this.orderRepository.findById(input.orderId)
    if (!order) {
      throw new Error(`Order ${input.orderId} not found`)
    }

    return {
      orderId: order.id,
      status: order.status,
    }
  }
}

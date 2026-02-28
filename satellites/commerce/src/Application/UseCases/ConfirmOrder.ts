import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import { OrderLifecycleContext } from '../../Domain/DCI/Contexts/OrderLifecycleContext'

/**
 * ConfirmOrder UseCase 輸入
 */
export interface ConfirmOrderInput {
  orderId: string
}

/**
 * ConfirmOrder UseCase 輸出
 */
export interface ConfirmOrderOutput {
  orderId: string
  status: string
}

/**
 * ConfirmOrder UseCase
 *
 * 確認訂單已付款（標記為 PAID 狀態）
 */
export class ConfirmOrder extends UseCase<ConfirmOrderInput, ConfirmOrderOutput> {
  constructor(
    private core: PlanetCore,
    private orderRepository: IOrderRepository
  ) {
    super()
  }

  async execute(input: ConfirmOrderInput): Promise<ConfirmOrderOutput> {
    const context = new OrderLifecycleContext(this.orderRepository, this.core)
    await context.execute({
      orderId: input.orderId,
      action: 'confirm',
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

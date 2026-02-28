import type { PlanetCore } from '@gravito/core'
import { CommerceError } from '../../../Application/Errors/CommerceError'
import type { IOrderRepository } from '../../Contracts/IOrderRepository'
import { injectOrderProcessorRole } from '../Roles/OrderProcessorRole'

/**
 * 訂單生命週期場景的輸入參數
 */
export interface OrderLifecycleInput {
  orderId: string
  action: 'confirm' | 'process' | 'ship' | 'complete'
}

/**
 * 訂單生命週期場景協調器
 *
 * 管理訂單的各個狀態轉移
 */
export class OrderLifecycleContext {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 執行生命週期操作
   */
  async execute(input: OrderLifecycleInput): Promise<void> {
    // 1. 載入訂單
    const order = await this.orderRepository.findById(input.orderId)
    if (!order) {
      throw CommerceError.orderNotFound(input.orderId)
    }

    // 2. 注入處理器角色
    const processor = injectOrderProcessorRole(order)

    // 3. 執行操作
    switch (input.action) {
      case 'confirm':
        processor.confirmPayment()
        // 觸發訂單已確認事件
        await this.core.hooks.doAction('commerce:order-confirmed', {
          orderId: order.id,
          memberId: order.memberId,
          totalAmount: order.total.value,
        })
        break
      case 'process':
        processor.markAsProcessing()
        break
      case 'ship':
        processor.markAsShipped()
        break
      case 'complete':
        processor.markAsCompleted()
        break
    }

    // 4. 保存訂單
    await this.orderRepository.save(order)
  }
}

/**
 * 建立訂單 Use Case
 *
 * 搶購系統的核心業務邏輯：
 * 1. 驗證商品存在且有庫存
 * 2. 建立訂單記錄
 * 3. 發送事件通知其他模塊
 */

import type { CreateOrderRequest, Order } from '../../Domain/Models'
import { OrderStatus } from '../../Domain/Models'
import type { IOrderRepository } from '../Contracts/IOrderRepository'
import type { IProductRepository } from '../Contracts/IProductRepository'

export interface CreateOrderResponse {
  order: Order
  message: string
}

/**
 * CreateOrder Use Case
 *
 * 建立新訂單，包含庫存驗證與訂單記錄
 */
export class CreateOrder {
  constructor(
    private productRepository: IProductRepository,
    private orderRepository: IOrderRepository,
    private eventBus?: any // 可選的事件總線，用於發送事件
  ) {}

  /**
   * 執行 Use Case
   */
  async execute(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    // 1. 驗證請求
    const validationErrors = request.validate()
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`)
    }

    // 2. 查詢商品
    const product = await this.productRepository.findById(request.productId)
    if (!product) {
      throw new Error(`Product not found: ${request.productId}`)
    }

    // 3. 驗證庫存
    if (product.stock < request.quantity) {
      throw new Error(
        `Insufficient stock for product ${product.sku}. Available: ${product.stock}, Requested: ${request.quantity}`
      )
    }

    // 4. 建立訂單
    const order = await this.orderRepository.create({
      userId: request.userId,
      status: OrderStatus.PENDING,
      items: [
        {
          id: `${Date.now()}-0`, // 簡單的 ID 生成
          orderId: '', // 暫時，將被設定
          productId: product.id,
          productName: product.name,
          quantity: request.quantity,
          unitPrice: product.price,
          totalPrice: product.price * request.quantity,
        },
      ],
      totalAmount: product.price * request.quantity,
    })

    // 5. 發送 OrderCreated 事件（用於觸發庫存鎖定）
    if (this.eventBus) {
      await this.eventBus.dispatch({
        event: 'order:created',
        data: {
          orderId: order.id,
          userId: request.userId,
          productId: request.productId,
          quantity: request.quantity,
          totalAmount: order.totalAmount,
        },
      })
    }

    return {
      order,
      message: `Order created successfully. Order ID: ${order.id}. Awaiting payment.`,
    }
  }
}

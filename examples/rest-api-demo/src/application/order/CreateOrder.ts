/**
 * CreateOrder Use Case
 */

import type { CreateOrderInput, Order, ShippingAddress } from '@domain/order/Order'
import { OrderDomainService } from '@domain/order/Order'
import type { OrderRepository } from '@infrastructure/repositories/OrderRepository'
import type { ProductRepository } from '@infrastructure/repositories/ProductRepository'

export interface CreateOrderRequest {
  userId: string
  items: Array<{ productId: string; quantity: number }>
  shippingAddress: ShippingAddress
  notes?: string
}

export class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private productRepository: ProductRepository
  ) {}

  async execute(request: CreateOrderRequest): Promise<Order> {
    // =====================================================================
    // 1. 驗證配送地址
    // =====================================================================
    if (!OrderDomainService.isValidShippingAddress(request.shippingAddress)) {
      throw new Error('Invalid shipping address')
    }

    // =====================================================================
    // 2. 驗證訂單項目並計算金額
    // =====================================================================
    if (!request.items || request.items.length === 0) {
      throw new Error('At least one item is required')
    }

    let subtotal = 0
    for (const item of request.items) {
      const product = await this.productRepository.findById(item.productId)
      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.sku}`)
      }
      subtotal += product.price * item.quantity
    }

    // =====================================================================
    // 3. 計算運費和稅費
    // =====================================================================
    const shippingCost = this.calculateShippingCost(subtotal)
    const tax = OrderDomainService.calculateTax(subtotal)

    // =====================================================================
    // 4. 創建訂單
    // =====================================================================
    const createOrderInput: CreateOrderInput = {
      userId: request.userId,
      items: request.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      shippingAddress: request.shippingAddress,
      subtotal,
      shippingCost,
      tax,
      notes: request.notes,
    }

    const order = await this.orderRepository.create(createOrderInput)

    // =====================================================================
    // 5. 更新商品庫存
    // =====================================================================
    for (const item of request.items) {
      await this.productRepository.decreaseStock(item.productId, item.quantity)
    }

    return order
  }

  private calculateShippingCost(subtotal: number): number {
    // 簡單的運費計算：免運費超過 $100
    if (subtotal >= 10000) {
      return 0
    }
    return 1000 // $10
  }
}

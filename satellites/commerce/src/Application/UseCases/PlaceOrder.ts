import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import type { CheckoutInput } from '../../Domain/DCI/Contexts/CheckoutContext'
import { CheckoutContext } from '../../Domain/DCI/Contexts/CheckoutContext'
import { OrderMapper } from '../DTOs/OrderMapper'

/**
 * PlaceOrder UseCase 輸入
 */
export interface PlaceOrderInput {
  userId: string | null
  idempotencyKey?: string
  items: {
    productId: string
    variantId: string
    sku: string
    name: string
    unitPrice: number
    quantity: number
    options?: Record<string, string>
  }[]
  currency?: string
}

/**
 * PlaceOrder UseCase 輸出
 */
export interface PlaceOrderOutput {
  orderId: string
  status: string
  total: number
  currency: string
  items: Array<{
    name: string
    quantity: number
    totalPrice: number
  }>
}

/**
 * PlaceOrder UseCase
 *
 * 薄殼 UseCase，委派 CheckoutContext 完成核心邏輯
 * 職責：
 * 1. 驗證輸入
 * 2. 委派給 CheckoutContext
 * 3. 計算調整項目（如運費、稅務）
 * 4. 轉換為 DTO 回應
 */
export class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderOutput> {
  constructor(
    private core: PlanetCore,
    private orderRepository: IOrderRepository,
    private adjustmentCalculator?: any // AdjustmentCalculator 可選
  ) {
    super()
  }

  async execute(input: PlaceOrderInput): Promise<PlaceOrderOutput> {
    const currency = input.currency || 'TWD'

    // 準備 CheckoutInput
    const checkoutInput: CheckoutInput = {
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      items: input.items,
      currency,
    }

    // 計算調整項目（透過 Hook）
    if (this.adjustmentCalculator) {
      checkoutInput.adjustments = await this.adjustmentCalculator.calculate(input.items, currency)
    } else {
      // 透過 Hook 讓其他 Satellite 提供調整項目
      const hookAdjustments = await this.core.hooks.applyFilters(
        'commerce:calculate-adjustments',
        [] as any[],
        { items: input.items, currency }
      )
      if (hookAdjustments && hookAdjustments.length > 0) {
        checkoutInput.adjustments = hookAdjustments
      }
    }

    // 執行結帳場景
    const context = new CheckoutContext(this.orderRepository, this.core)
    const result = await context.execute(checkoutInput)

    // 載入建立的訂單並轉換為 DTO
    const order = await this.orderRepository.findById(result.orderId)
    if (!order) {
      throw new Error(`Order ${result.orderId} not found after creation`)
    }

    const dto = OrderMapper.toDTO(order)

    return {
      orderId: result.orderId,
      status: result.status,
      total: result.total,
      currency: result.currency,
      items: dto.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      })),
    }
  }
}

import type { PlanetCore } from '@gravito/core'
import type { IOrderRepository } from '../../Contracts/IOrderRepository'
import { Order } from '../../Entities/Order'
import { Adjustment, type AdjustmentType } from '../../ValueObjects/Adjustment'
import { LineItem } from '../../ValueObjects/LineItem'
import { Money } from '../../ValueObjects/Money'
import { injectCheckoutableRole } from '../Roles/CheckoutableRole'

/**
 * 結帳場景的輸入參數
 */
export interface CheckoutInput {
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
  adjustments?: {
    type: AdjustmentType
    label: string
    amount: number
    sourceType?: string
    sourceId?: string
  }[]
  currency?: string
}

/**
 * 結帳場景的輸出結果
 */
export interface CheckoutResult {
  orderId: string
  status: string
  total: number
  currency: string
}

/**
 * 結帳場景協調器
 *
 * 協調完整的訂單建立和結帳流程
 */
export class CheckoutContext {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 執行結帳流程
   *
   * 流程：
   * 1. 檢查冪等性
   * 2. 驗證訂單項目
   * 3. 建立訂單和明細
   * 4. 應用調整項目
   * 5. 保存訂單
   * 6. 觸發事件
   */
  async execute(input: CheckoutInput): Promise<CheckoutResult> {
    const currency = input.currency || 'TWD'

    // 1. 檢查冪等性
    if (input.idempotencyKey) {
      const existing = await this.orderRepository.findByIdempotencyKey(input.idempotencyKey)
      if (existing) {
        return {
          orderId: existing.id,
          status: existing.status,
          total: existing.total.value,
          currency: existing.currency,
        }
      }
    }

    // 2. 建立訂單
    const orderId = crypto.randomUUID()
    const order = Order.create(orderId, input.userId, input.idempotencyKey, currency)

    // 3. 驗證並新增訂單項目
    const lineItems = input.items.map((item) =>
      LineItem.create(
        item.productId,
        item.variantId,
        item.sku,
        item.name,
        Money.of(item.unitPrice, currency),
        item.quantity,
        item.options
      )
    )

    const checkoutable = injectCheckoutableRole(order)
    checkoutable.validateItems(lineItems)

    for (const item of lineItems) {
      order.addItem(item)
    }

    // 4. 新增調整項目
    if (input.adjustments && input.adjustments.length > 0) {
      const adjustments = input.adjustments.map((adj) =>
        Adjustment.create(
          adj.type,
          adj.label,
          Money.of(adj.amount, currency),
          adj.sourceType,
          adj.sourceId
        )
      )

      checkoutable.applyAdjustments(adjustments)

      for (const adjustment of adjustments) {
        order.addAdjustment(adjustment)
      }
    }

    // 5. 保存訂單
    await this.orderRepository.save(order)

    // 6. 觸發訂單已建立 Hook（以供其他 Satellite 監聽）
    await this.core.hooks.doAction('commerce:order-placed', {
      orderId: order.id,
      memberId: order.memberId,
      totalAmount: order.total.value,
      currency: order.currency,
      items: order.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    })

    return {
      orderId: order.id,
      status: order.status,
      total: order.total.value,
      currency: order.currency,
    }
  }
}

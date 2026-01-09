import type { PlanetCore } from '@gravito/core'
import { Adjustment, type Order } from '../../Domain/Entities/Order'

export class AdjustmentCalculator {
  constructor(private core: PlanetCore) {}

  /**
   * 計算並應用所有的調整項 (折扣、運費、稅務)
   */
  async calculate(order: Order): Promise<void> {
    // 1. 預設基礎調整項：固定運費 (示範)
    const baseShippingFee = 60
    order.addAdjustment(
      new Adjustment(crypto.randomUUID(), {
        label: 'Standard Shipping',
        amount: baseShippingFee,
        sourceType: 'shipping',
        sourceId: 'standard',
      })
    )

    // 2. 關鍵：利用 Gravito Filters 讓外部插件 (如 Marketing) 注入調整項
    // 這體現了 Galaxy 架構的絲滑擴充能力
    const adjustments = await this.core.hooks.applyFilters('commerce:order:adjustments', [], {
      order,
    })

    if (Array.isArray(adjustments)) {
      adjustments.forEach((adj) => {
        order.addAdjustment(adj)
      })
    }
  }
}

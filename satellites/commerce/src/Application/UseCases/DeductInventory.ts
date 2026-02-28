/**
 * 扣減庫存 Use Case
 *
 * 透過 Hook 通知 Catalog Satellite 扣減庫存
 * 使用事件通訊，遵守 Satellite 隔離原則
 */

import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import { CommerceError } from '../Errors/CommerceError'

/**
 * DeductInventory 輸入
 */
export interface DeductInventoryInput {
  orderId: string
  items: Array<{
    variantId: string
    quantity: number
  }>
}

/**
 * DeductInventory UseCase
 *
 * 當訂單確認支付後，透過 Hook 通知 Catalog Satellite 扣減庫存。
 * 遵守 Satellite 隔離原則：不直接導入 Catalog，使用事件通訊。
 */
export class DeductInventory extends UseCase<DeductInventoryInput, void> {
  constructor(private core: PlanetCore) {
    super()
  }

  /**
   * 執行庫存扣減
   *
   * 透過 `catalog.inventory.deduct` Hook 通知 Catalog Satellite
   */
  async execute(input: DeductInventoryInput): Promise<void> {
    if (!input.orderId) {
      throw CommerceError.orderNotFound('')
    }

    if (!input.items || input.items.length === 0) {
      throw CommerceError.invalidCheckout('庫存扣減項目不能為空')
    }

    this.core.logger.info(
      `[Commerce] 扣減庫存 - 訂單: ${input.orderId}, 項目數: ${input.items.length}`
    )

    // 透過 Hook 通知 Catalog Satellite 執行庫存扣減
    // Catalog Satellite 監聽此 Hook 並執行實際扣減
    await this.core.hooks.doAction('catalog.inventory.deduct', {
      orderId: input.orderId,
      items: input.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    })

    this.core.logger.info(`[Commerce] 庫存扣減請求已發送 - 訂單: ${input.orderId}`)
  }
}

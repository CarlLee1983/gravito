/**
 * Release Inventory Job
 *
 * 釋放庫存 Job - 補償邏輯（當扣減失敗時觸發）
 */

import { Job } from '@gravito/stream'
import { getCore } from '../../app'
import { recordEvent, withSpan } from '../../tracing/tracer'
import type { ReleaseInventoryJobPayload } from '../../types/queue'

/**
 * 釋放庫存 Job
 *
 * 流程：
 * 1. 調用 inventoryLock.releaseInventory Use Case
 * 2. 成功：記錄補償完成
 * 3. 失敗：dispatch inventory:release_failed event（告警）
 */
export class ReleaseInventoryJob extends Job {
  public payload!: ReleaseInventoryJobPayload

  constructor(payload?: ReleaseInventoryJobPayload) {
    super()
    if (payload) {
      this.payload = payload
    }
    this.queueName = 'inventory'
  }

  /**
   * 執行 Job
   */
  async handle(): Promise<void> {
    await withSpan(
      'job.release_inventory',
      {
        'job.type': 'ReleaseInventoryJob',
        'flash_sale.order_id': this.payload.orderId,
        'flash_sale.lock_id': this.payload.lockId,
        'flash_sale.compensation': true,
        'flash_sale.release_reason': this.payload.reason,
      },
      async (_span) => {
        const core = getCore()
        const logger = core.logger

        logger.info(
          `[ReleaseInventoryJob] 開始執行補償: orderId=${this.payload.orderId}, reason=${this.payload.reason}`
        )

        // 取得 Inventory-Lock Use Case
        const releaseInventory = core.container.make<any>('inventory-lock.release-inventory')

        // 執行庫存釋放
        await releaseInventory?.execute?.({
          lockId: this.payload.lockId,
        })

        logger.info(
          `[ReleaseInventoryJob] ✅ 補償完成: orderId=${this.payload.orderId}, lockId=${this.payload.lockId}`
        )

        recordEvent('inventory_released', {
          'flash_sale.product_id': this.payload.productId,
          'flash_sale.quantity': this.payload.quantity,
        })

        // 觸發事件：庫存已釋放（補償完成）
        await core.hooks.doAction('inventory:released', {
          orderId: this.payload.orderId,
          lockId: this.payload.lockId,
          productId: this.payload.productId,
          quantity: this.payload.quantity,
          reason: this.payload.reason,
        })
      }
    )
  }

  /**
   * Job 永久失敗時的處理
   */
  async failed(): Promise<void> {
    const core = getCore()
    const logger = core.logger

    logger.error(
      `[ReleaseInventoryJob] 🔴 永久失敗 (max retries exceeded): orderId=${this.payload.orderId}, lockId=${this.payload.lockId}`
    )

    // 觸發嚴重告警事件（庫存洩漏，可能導致超賣）
    await core.hooks.doAction('inventory:release_permanent_failure', {
      orderId: this.payload.orderId,
      lockId: this.payload.lockId,
      productId: this.payload.productId,
      quantity: this.payload.quantity,
      message: '庫存釋放失敗，可能導致庫存洩漏',
      maxAttempts: this.maxAttempts,
    })
  }
}

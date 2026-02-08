/**
 * Lock Inventory Job
 *
 * 鎖定庫存 Job - 執行庫存鎖定邏輯
 */

import { Job } from '@gravito/stream'
import { getCore } from '../../app'
import { recordEvent, withSpan } from '../../tracing/tracer'
import type { LockInventoryJobPayload } from '../../types/queue'

/**
 * 鎖定庫存 Job
 *
 * 流程：
 * 1. 調用 inventoryLock.lockInventory Use Case
 * 2. 成功：dispatch order:ready_for_payment event
 * 3. 失敗：dispatch order:lock_failed event
 */
export class LockInventoryJob extends Job {
  public payload!: LockInventoryJobPayload

  constructor(payload?: LockInventoryJobPayload) {
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
      'job.lock_inventory',
      {
        'job.type': 'LockInventoryJob',
        'flash_sale.order_id': this.payload.orderId,
        'flash_sale.product_id': this.payload.productId,
        'flash_sale.quantity': this.payload.quantity,
      },
      async (span) => {
        const core = getCore()
        const logger = core.logger

        logger.info(`[LockInventoryJob] 開始執行: orderId=${this.payload.orderId}`)

        // 取得 Inventory-Lock Use Case
        const inventoryLock = core.container.make<any>('inventory-lock.lock-inventory')

        // 執行庫存鎖定
        const result = await inventoryLock?.execute?.({
          orderId: this.payload.orderId,
          productId: this.payload.productId,
          quantity: this.payload.quantity,
        })

        logger.info(
          `[LockInventoryJob] ✅ 完成: orderId=${this.payload.orderId}, lockId=${result.id}`
        )

        recordEvent('inventory_locked', {
          'flash_sale.lock_id': result.id,
          'flash_sale.lock_version': result.version,
        })

        span.setAttributes({ 'flash_sale.lock_id': result.id })

        // 觸發事件：訂單已準備好支付
        // 注意：具體的事件類型和 dispatch 方式依賴於 Gravito 的事件系統實現
        await core.hooks.doAction('order:ready_for_payment', {
          orderId: this.payload.orderId,
          lockId: result.id,
          lockVersion: result.version,
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
      `[LockInventoryJob] 🔴 永久失敗 (max retries exceeded): orderId=${this.payload.orderId}`
    )

    // 觸發告警事件
    await core.hooks.doAction('order:lock_permanent_failure', {
      orderId: this.payload.orderId,
      maxAttempts: this.maxAttempts,
      attempts: this.attempts,
    })
  }
}

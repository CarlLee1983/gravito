/**
 * Release Inventory Job
 *
 * 釋放庫存 Job - 補償邏輯（當扣減失敗時觸發）
 */

import { Job } from '@gravito/stream'
import { getCore } from '../../app'
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
    const core = getCore()
    const logger = core.logger

    try {
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

      // 觸發事件：庫存已釋放（補償完成）
      await core.hooks.doAction('inventory:released', {
        orderId: this.payload.orderId,
        lockId: this.payload.lockId,
        productId: this.payload.productId,
        quantity: this.payload.quantity,
        reason: this.payload.reason,
      })
    } catch (error) {
      const logger = getCore().logger
      logger.error(
        `[ReleaseInventoryJob] ❌ 釋放失敗: orderId=${this.payload.orderId}, lockId=${this.payload.lockId}`,
        error
      )

      // 觸發事件：庫存釋放失敗（需要告警/人工介入）
      await core.hooks.doAction('inventory:release_failed', {
        orderId: this.payload.orderId,
        lockId: this.payload.lockId,
        productId: this.payload.productId,
        quantity: this.payload.quantity,
        reason: this.payload.reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // 重新拋出錯誤以觸發重試
      throw error
    }
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

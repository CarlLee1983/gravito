/**
 * Deduct Inventory Job
 *
 * 扣減庫存 Job - 支付成功後執行實際的庫存扣減
 */

import { Job } from '@gravito/stream'
import { getCore, getQueueManager } from '../../app'
import type { DeductInventoryJobPayload } from '../../types/queue'
import { ConfirmOrderJob } from './ConfirmOrderJob'
import { ReleaseInventoryJob } from './ReleaseInventoryJob'

/**
 * 扣減庫存 Job
 *
 * 流程：
 * 1. 調用 inventoryLock.deductInventory Use Case
 * 2. 成功：push ConfirmOrderJob
 * 3. 失敗：push ReleaseInventoryJob（補償）
 */
export class DeductInventoryJob extends Job {
  public payload!: DeductInventoryJobPayload

  constructor(payload?: DeductInventoryJobPayload) {
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
    const queueManager = getQueueManager()

    try {
      logger.info(`[DeductInventoryJob] 開始執行: orderId=${this.payload.orderId}`)

      // 取得 Inventory-Lock Use Case
      const inventoryLock = core.container.make<any>('inventory-lock.deduct-inventory')

      // 執行庫存扣減
      const _result = await inventoryLock?.execute?.({
        orderId: this.payload.orderId,
        lockId: this.payload.lockId,
        version: this.payload.lockVersion,
      })

      logger.info(
        `[DeductInventoryJob] ✅ 扣減完成: orderId=${this.payload.orderId}, lockId=${this.payload.lockId}`
      )

      // 扣減成功：推送訂單確認 Job
      const confirmJob = new ConfirmOrderJob({
        orderId: this.payload.orderId,
        lockId: this.payload.lockId,
      })

      await queueManager.push(confirmJob.onQueue('orders'))

      logger.info(`[DeductInventoryJob] 推送 ConfirmOrderJob: orderId=${this.payload.orderId}`)
    } catch (error) {
      const logger = getCore().logger
      logger.error(`[DeductInventoryJob] ❌ 扣減失敗: orderId=${this.payload.orderId}`, error)

      // 扣減失敗：推送補償 Job（釋放庫存）
      const releaseJob = new ReleaseInventoryJob({
        orderId: this.payload.orderId,
        lockId: this.payload.lockId,
        productId: this.payload.productId,
        quantity: this.payload.quantity,
        reason: 'deduction_failed',
      })

      try {
        await queueManager.push(releaseJob.onQueue('inventory'))
        logger.info(
          `[DeductInventoryJob] 推送補償 Job (ReleaseInventoryJob): orderId=${this.payload.orderId}`
        )
      } catch (pushError) {
        logger.error(`[DeductInventoryJob] 推送補償 Job 失敗`, pushError)
      }

      // 觸發事件：扣減失敗
      await core.hooks.doAction('order:deduct_failed', {
        orderId: this.payload.orderId,
        reason: error instanceof Error ? error.message : 'Unknown error',
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
      `[DeductInventoryJob] 🔴 永久失敗 (max retries exceeded): orderId=${this.payload.orderId}`
    )

    // 觸發告警事件（需要人工介入）
    await core.hooks.doAction('order:deduct_permanent_failure', {
      orderId: this.payload.orderId,
      lockId: this.payload.lockId,
      maxAttempts: this.maxAttempts,
    })
  }
}

/**
 * Confirm Order Job
 *
 * 確認訂單 Job - 完成訂單流程的最後一步
 */

import { Job } from '@gravito/stream'
import { getCore } from '../../app'
import { recordEvent, withSpan } from '../../tracing/tracer'
import type { ConfirmOrderJobPayload } from '../../types/queue'

/**
 * 確認訂單 Job
 *
 * 流程：
 * 1. 調用 flashSale.confirmOrder Use Case
 * 2. 成功：dispatch order:confirmed event
 * 3. 失敗：dispatch order:confirm_failed event（需人工介入）
 */
export class ConfirmOrderJob extends Job {
  public payload!: ConfirmOrderJobPayload

  constructor(payload?: ConfirmOrderJobPayload) {
    super()
    if (payload) {
      this.payload = payload
    }
    this.queueName = 'orders'
  }

  /**
   * 執行 Job
   */
  async handle(): Promise<void> {
    await withSpan(
      'job.confirm_order',
      {
        'job.type': 'ConfirmOrderJob',
        'flash_sale.order_id': this.payload.orderId,
        'flash_sale.lock_id': this.payload.lockId,
      },
      async (_span) => {
        const core = getCore()
        const logger = core.logger

        logger.info(`[ConfirmOrderJob] 開始執行: orderId=${this.payload.orderId}`)

        // 取得 Flash-Sale Use Case
        const confirmOrder = core.container.make<any>('flash-sale.confirm-order')

        // 執行訂單確認
        const _result = await confirmOrder?.execute?.({
          orderId: this.payload.orderId,
          lockId: this.payload.lockId,
        })

        logger.info(`[ConfirmOrderJob] ✅ 完成: orderId=${this.payload.orderId}`)

        recordEvent('order_confirmed', {
          'flash_sale.order_id': this.payload.orderId,
          'flash_sale.confirmed_at': new Date().toISOString(),
        })

        // 觸發事件：訂單已確認
        await core.hooks.doAction('order:confirmed', {
          orderId: this.payload.orderId,
          lockId: this.payload.lockId,
          confirmedAt: new Date().toISOString(),
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
      `[ConfirmOrderJob] 🔴 永久失敗 (max retries exceeded): orderId=${this.payload.orderId}`
    )

    // 觸發告警事件（需要人工介入 - 此訂單處於不一致狀態）
    await core.hooks.doAction('order:confirm_permanent_failure', {
      orderId: this.payload.orderId,
      message: '訂單處於不一致狀態，需要人工審核',
      maxAttempts: this.maxAttempts,
    })
  }
}

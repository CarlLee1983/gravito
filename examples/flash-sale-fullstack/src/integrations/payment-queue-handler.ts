/**
 * Payment to Queue Integration Handler
 *
 * 監聽支付成功事件，推送庫存扣減 Job
 */

import type { PlanetCore } from '@gravito/core'
import { getQueueManager } from '../app'
import { DeductInventoryJob } from '../queue/jobs/DeductInventoryJob'
import type { DeductInventoryJobPayload } from '../types/queue'

/**
 * 設置 Payment 到隊列的整合
 *
 * 當 Payment Satellite 完成支付時，此處理器會：
 * 1. 從 Payment Intent metadata 中讀取 lockId
 * 2. 推送 DeductInventoryJob 到隊列
 */
export function setupPaymentQueueIntegration(core: PlanetCore): void {
  const logger = core.logger

  // 監聽支付成功 Hook
  core.hooks.addAction('payment:succeeded', async (payload: any) => {
    try {
      logger.info(`[Payment→Queue] 支付成功，準備推送庫存扣減 Job`)
      logger.info(`[Payment→Queue] orderId: ${payload.orderId}`)

      const orderId = payload.orderId
      const lockId = payload.lockId // 此欄位需要從某處取得

      // 如果沒有 lockId，嘗試從訂單中查詢
      if (!lockId) {
        logger.warn(`[Payment→Queue] 警告：未找到 lockId，需要從訂單或其他來源查詢`)
        // 這裡應該查詢訂單數據以取得 lockId
        // 暫時跳過，等待框架決策
        return
      }

      const queueManager = getQueueManager()

      // 構建 Payload
      const jobPayload: DeductInventoryJobPayload = {
        orderId,
        lockId,
        productId: '', // 需要從訂單中取得
        quantity: 0, // 需要從訂單中取得
        lockVersion: 1, // 需要從訂單中取得
      }

      // 推送 Job
      const job = new DeductInventoryJob(jobPayload)
      await queueManager.push(job.onQueue('inventory'))

      logger.info(`[Payment→Queue] ✅ DeductInventoryJob 已推送: orderId=${orderId}`)
    } catch (error) {
      logger.error(`[Payment→Queue] ❌ 推送 Job 失敗`, error)
      // 不拋出錯誤，防止支付流程中斷
    }
  })

  logger.info('[Payment→Queue] 整合已設置')
}

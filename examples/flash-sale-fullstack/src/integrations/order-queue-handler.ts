/**
 * Order to Queue Integration Handler
 *
 * 監聽訂單建立事件，推送庫存鎖定 Job
 */

import type { PlanetCore } from '@gravito/core'
import { getQueueManager } from '../app'
import { LockInventoryJob } from '../queue/jobs/LockInventoryJob'
import { recordEvent, withSpan } from '../tracing/tracer'
import type { LockInventoryJobPayload } from '../types/queue'

/**
 * 設置訂單到隊列的整合
 *
 * 當 Flash-Sale Satellite 建立訂單時，此處理器會：
 * 1. 接收 order:created 事件
 * 2. 推送 LockInventoryJob 到隊列
 */
export function setupOrderQueueIntegration(core: PlanetCore): void {
  const logger = core.logger

  // 監聽訂單建立事件（使用 hooks 系統）
  core.hooks.addAction('order:created', async (payload: any) => {
    try {
      await withSpan(
        'integration.order_to_queue',
        {
          'flash_sale.order_id': payload.orderId,
          'flash_sale.product_id': payload.productId,
          'integration.source': 'order:created',
          'integration.target': 'LockInventoryJob',
        },
        async (_span) => {
          logger.info(`[Order→Queue] 訂單已建立，準備鎖定庫存`)
          logger.info(
            `[Order→Queue] orderId: ${payload.orderId}, productId: ${payload.productId}, quantity: ${payload.quantity}`
          )

          const queueManager = getQueueManager()

          // 生成鎖定 ID
          const lockId = `lock-${payload.orderId}-${Date.now()}`

          // 構建 Payload
          const jobPayload: LockInventoryJobPayload = {
            orderId: payload.orderId,
            lockId,
            productId: payload.productId,
            quantity: payload.quantity,
            lockVersion: 1,
          }

          // 推送 Job
          const job = new LockInventoryJob(jobPayload)
          await queueManager.push(job.onQueue('inventory'))

          recordEvent('job_pushed', { 'job.type': 'LockInventoryJob' })

          logger.info(
            `[Order→Queue] ✅ LockInventoryJob 已推送: orderId=${payload.orderId}, lockId=${lockId}`
          )
        }
      )
    } catch (error) {
      logger.error(`[Order→Queue] ❌ 推送 Job 失敗`, error)
      // 不拋出錯誤，防止訂單建立流程中斷
    }
  })

  logger.info('[Order→Queue] 整合已設置')
}

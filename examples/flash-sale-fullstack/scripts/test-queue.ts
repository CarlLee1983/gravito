/**
 * Test Queue Script
 *
 * 測試隊列功能 - 推送測試 Job 並查詢隊列統計
 * 用法：bun run scripts/test-queue.ts
 */

import { Application } from '@gravito/core'
import { GravitoConfig } from '../src/gravito.config'
import { initializeQueueManager } from '../src/queue'
import { ConfirmOrderJob } from '../src/queue/jobs/ConfirmOrderJob'
import { DeductInventoryJob } from '../src/queue/jobs/DeductInventoryJob'
import { LockInventoryJob } from '../src/queue/jobs/LockInventoryJob'
import { ReleaseInventoryJob } from '../src/queue/jobs/ReleaseInventoryJob'
import type { LockInventoryJobPayload } from '../src/types/queue'

/**
 * 測試隊列
 */
async function testQueue(): Promise<void> {
  const app = new Application({
    basePath: process.cwd(),
    env: process.env.NODE_ENV || 'development',
  })

  app.config.load(GravitoConfig)
  await app.boot()

  const queueManager = await initializeQueueManager()
  const logger = app.core.logger

  try {
    logger.info('📋 開始測試隊列系統...\n')

    // 生成測試數據
    const testOrderId = `test-order-${Date.now()}`
    const testLockId = `lock-${Date.now()}`

    logger.info(`🧪 測試訂單 ID: ${testOrderId}`)
    logger.info(`🧪 測試鎖定 ID: ${testLockId}\n`)

    // 測試 1: 推送 LockInventoryJob
    logger.info('▶️  測試 1: 推送 LockInventoryJob...')
    const lockJob = new LockInventoryJob({
      orderId: testOrderId,
      lockId: testLockId,
      productId: 'product-001',
      quantity: 5,
      lockVersion: 1,
    } as LockInventoryJobPayload)

    await queueManager.push(lockJob.onQueue('inventory'))
    logger.info('✅ LockInventoryJob 已推送\n')

    // 測試 2: 推送 DeductInventoryJob
    logger.info('▶️  測試 2: 推送 DeductInventoryJob...')
    const deductJob = new DeductInventoryJob({
      orderId: testOrderId,
      lockId: testLockId,
      productId: 'product-001',
      quantity: 5,
      lockVersion: 1,
    })

    await queueManager.push(deductJob.onQueue('inventory'))
    logger.info('✅ DeductInventoryJob 已推送\n')

    // 測試 3: 推送 ConfirmOrderJob
    logger.info('▶️  測試 3: 推送 ConfirmOrderJob...')
    const confirmJob = new ConfirmOrderJob({
      orderId: testOrderId,
      lockId: testLockId,
    })

    await queueManager.push(confirmJob.onQueue('orders'))
    logger.info('✅ ConfirmOrderJob 已推送\n')

    // 測試 4: 推送 ReleaseInventoryJob
    logger.info('▶️  測試 4: 推送 ReleaseInventoryJob...')
    const releaseJob = new ReleaseInventoryJob({
      orderId: testOrderId,
      lockId: testLockId,
      productId: 'product-001',
      quantity: 5,
      reason: 'manual',
    })

    await queueManager.push(releaseJob.onQueue('inventory'))
    logger.info('✅ ReleaseInventoryJob 已推送\n')

    // 查詢 Redis 隊列統計
    logger.info('📊 隊列統計:')
    const redis = app.core.redis.default

    const inventoryQueueLength = await redis.llen('flash-sale:queue:inventory')
    const ordersQueueLength = await redis.llen('flash-sale:queue:orders')

    logger.info(`   📦 inventory queue: ${inventoryQueueLength} jobs`)
    logger.info(`   📦 orders queue: ${ordersQueueLength} jobs`)

    // 查看 DLQ（dead letter queue）
    const dlqLength = await redis.llen('flash-sale:queue:inventory:failed')
    if (dlqLength > 0) {
      logger.info(`   ⚠️  DLQ (inventory): ${dlqLength} failed jobs`)
    }

    logger.info('\n✅ 隊列測試完成')
    logger.info('💡 提示：運行 "bun run consumer" 啟動 Consumer 來處理這些 Job')
  } catch (error) {
    logger.error('❌ 測試失敗:', error)
    process.exit(1)
  } finally {
    await app.core.redis.quit()
  }
}

// 執行
testQueue().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})

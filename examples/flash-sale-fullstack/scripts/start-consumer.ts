/**
 * Consumer Startup Script
 *
 * 啟動隊列消費者服務
 * 用法：bun run scripts/start-consumer.ts
 */

import { Application } from '@gravito/core'
import { GravitoConfig } from '../src/gravito.config'
import { initializeQueueManager } from '../src/queue'
import { startConsumerService, stopConsumerService } from '../src/queue/consumer'

/**
 * 啟動 Consumer
 */
async function startConsumer(): Promise<void> {
  const app = new Application({
    basePath: process.cwd(),
    env: process.env.NODE_ENV || 'development',
  })

  app.config.load(GravitoConfig)
  await app.boot()

  // 初始化隊列管理器
  const queueManager = await initializeQueueManager()
  app.core.logger.info('✅ Queue Manager initialized')

  // 啟動 Consumer 服務
  await startConsumerService(queueManager, app.core.logger)

  // 優雅關閉處理
  const handleShutdown = async (signal: string) => {
    app.core.logger.info(`\n[Consumer] 收到 ${signal} 信號，開始優雅關閉...`)
    await stopConsumerService()
    await app.core.redis.quit()
    process.exit(0)
  }

  process.on('SIGINT', () => handleShutdown('SIGINT'))
  process.on('SIGTERM', () => handleShutdown('SIGTERM'))

  app.core.logger.info('✅ Consumer service is running. Press Ctrl+C to stop.')
}

// 執行
startConsumer().catch((error) => {
  console.error('❌ Failed to start consumer:', error)
  process.exit(1)
})

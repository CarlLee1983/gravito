/**
 * Flash Sale System - Main Application Entry Point
 *
 * 搶購系統主應用入口
 */

import { Application } from '@gravito/core'
import type { QueueManager } from '@gravito/stream'
import { GravitoConfig } from './gravito.config'
import { setupOrderQueueIntegration } from './integrations/order-queue-handler'
import { setupPaymentQueueIntegration } from './integrations/payment-queue-handler'
import { initializeQueueManager } from './queue'

let globalApp: Application | null = null
let globalQueueManager: QueueManager | null = null

/**
 * 取得全局 Core 實例（供 Job 和其他異步代碼使用）
 */
export function getCore() {
  if (!globalApp) {
    throw new Error('Application not initialized. Call bootstrap() first.')
  }
  return globalApp.core
}

/**
 * 取得全局 QueueManager 實例
 */
export function getQueueManager(): QueueManager {
  if (!globalQueueManager) {
    throw new Error('QueueManager not initialized. Call bootstrap() first.')
  }
  return globalQueueManager
}

/**
 * 初始化並啟動應用
 */
async function bootstrap(): Promise<void> {
  const _env = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'testing'

  const app = new Application(GravitoConfig as any)

  // 啟動應用
  await app.boot()

  // 初始化隊列系統
  globalQueueManager = await initializeQueueManager()

  // 保存全局應用實例
  globalApp = app

  // 設置 Satellites 與隊列系統的整合
  setupOrderQueueIntegration(app.core)
  setupPaymentQueueIntegration(app.core)

  // 記錄啟動訊息
  app.core.logger.info('🚀 Flash Sale System started')
  app.core.logger.info(`📍 Environment: ${app.env}`)
  app.core.logger.info(`🌐 Listen on: http://localhost:3000`)
  app.core.logger.info('📦 Queue Manager initialized')
  app.core.logger.info('🔗 Satellites integrations configured')
}

// 啟動應用
bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})

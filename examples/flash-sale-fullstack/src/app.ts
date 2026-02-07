/**
 * Flash Sale System - Main Application Entry Point
 *
 * 搶購系統主應用入口
 */

import { Application } from '@gravito/core'
import { FlashSaleServiceProvider } from '@gravito/satellite-flash-sale'
import { InventoryLockServiceProvider } from '@gravito/satellite-inventory-lock'
import { PaymentServiceProvider } from '@gravito/satellite-payment'
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

  // Create Application with proper configuration structure
  const p1 = new FlashSaleServiceProvider()
  const p2 = new InventoryLockServiceProvider()
  const p3 = new PaymentServiceProvider()

  const providers = [p1, p2, p3]

  console.log('Provider 1:', {
    name: p1.constructor.name,
    type: typeof p1,
    hasRegister: typeof (p1 as any).register,
    hasBoot: typeof (p1 as any).boot,
  })

  const app = new Application({
    basePath: process.cwd(),
    config: GravitoConfig,
    env: _env,
    // Register satellite providers directly
    providers,
  } as any)

  // 啟動應用
  await app.boot()

  // 初始化隊列系統
  globalQueueManager = await initializeQueueManager()

  // 保存全局應用實例
  globalApp = app

  // 設置 Satellites 與隊列系統的整合
  setupOrderQueueIntegration(app.core)
  setupPaymentQueueIntegration(app.core)

  // 啟動 HTTP 伺服器
  const liftoffConfig = app.core.liftoff()

  // 記錄啟動訊息
  app.core.logger.info('🚀 Flash Sale System started')
  app.core.logger.info(`📍 Environment: ${app.env}`)
  app.core.logger.info(`🌐 Listen on: http://localhost:${liftoffConfig.port}`)
  app.core.logger.info('📦 Queue Manager initialized')
  app.core.logger.info('🔗 Satellites integrations configured')

  // 啟動 Bun 服務器
  if (typeof Bun !== 'undefined') {
    Bun.serve(liftoffConfig)
    app.core.logger.info('✅ HTTP Server is running')
  }
}

// 啟動應用
bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})

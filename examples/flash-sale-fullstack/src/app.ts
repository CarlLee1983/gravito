/**
 * Flash Sale System - Main Application Entry Point
 *
 * 搶購系統主應用入口
 */

import { Application, shutdownOpenTelemetry } from '@gravito/core'
import { FlashSaleServiceProvider } from '@gravito/satellite-flash-sale'
import { InventoryLockServiceProvider } from '@gravito/satellite-inventory-lock'
import { PaymentServiceProvider } from '@gravito/satellite-payment'
import type { QueueManager } from '@gravito/stream'
import { DynamicPoolManager } from './database/DynamicPoolManager'
import { GravitoConfig } from './gravito.config'
import { setupOrderQueueIntegration } from './integrations/order-queue-handler'
import { setupPaymentQueueIntegration } from './integrations/payment-queue-handler'
import { initializeQueueManager } from './queue'
import { httpTracingMiddleware } from './tracing/http-tracing-middleware'
import { initializeTracing } from './tracing/setup'

let globalApp: Application | null = null
let globalQueueManager: QueueManager | null = null
let globalPoolManager: DynamicPoolManager | null = null

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

  // 1. 初始化 OpenTelemetry（必須在任何其他初始化之前）
  const otelSdk = await initializeTracing(GravitoConfig.openTelemetry)
  if (otelSdk) {
    console.log('[Tracing] OpenTelemetry SDK initialized successfully')
  }

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

  // P0.3：初始化動態連接池管理器
  globalPoolManager = new DynamicPoolManager(
    {
      minPoolSize: 2,
      maxPoolSize: 50,
      checkInterval: 30000,
      changeThreshold: 60000,
      expandThreshold: 0.8,
      shrinkThreshold: 0.2,
    },
    app.core.logger
  )
  globalPoolManager.startMonitoring(app.core)
  app.core.logger.info('[PoolManager] 動態連接池已初始化')

  // 設置 Satellites 與隊列系統的整合
  setupOrderQueueIntegration(app.core)
  setupPaymentQueueIntegration(app.core)

  // 掛載 HTTP tracing 中間件（全局）
  const honoApp = app.core.app as any
  honoApp.use('*', httpTracingMiddleware())
  app.core.logger.info('[Tracing] HTTP tracing middleware registered')

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
    Bun.serve(liftoffConfig as any)
    app.core.logger.info('✅ HTTP Server is running')
  }

  // 註冊 shutdown hook - 確保 OTel Spans 被正確 flush
  process.on('SIGTERM', async () => {
    app.core.logger.info('SIGTERM received, shutting down gracefully...')
    // 停止動態連接池監控
    if (globalPoolManager) {
      globalPoolManager.stopMonitoring()
    }
    await shutdownOpenTelemetry()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    app.core.logger.info('SIGINT received, shutting down gracefully...')
    // 停止動態連接池監控
    if (globalPoolManager) {
      globalPoolManager.stopMonitoring()
    }
    await shutdownOpenTelemetry()
    process.exit(0)
  })
}

// 啟動應用
bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})

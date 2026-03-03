/**
 * Flash Sale System - Main Application Entry Point
 *
 * 搶購系統主應用入口 (Refactored)
 */

import { Application } from '@gravito/core'
import type { MonitorService } from '@gravito/monitor'
import { FlashSaleServiceProvider } from '@gravito/satellite-flash-sale'
// @ts-expect-error - Local satellite package may not have declaration files
import { InventoryLockServiceProvider } from '@gravito/satellite-inventory-lock'
// @ts-expect-error - Local satellite package may not have declaration files
import { PaymentServiceProvider } from '@gravito/satellite-payment'
import type { QueueManager } from '@gravito/stream'
import { bootstrapMonitor } from './bootstrap/monitor'
import { bootstrapResilience } from './bootstrap/resilience'
import type { AsyncInvalidationEngine } from './cache/async/AsyncInvalidationEngine'
import type { EventAggregator } from './cache/events/EventAggregator'
import { GravitoConfig } from './gravito.config'
import { AppServiceProvider } from './providers/AppServiceProvider'
import { initializeQueueManager } from './queue'
import { httpTracingMiddleware } from './tracing/http-tracing-middleware'

let globalApp: Application | null = null

/**
 * 取得全局 Core 實例
 */
export function getCore() {
  if (!globalApp) {
    throw new Error('Application not initialized. Call bootstrap() first.')
  }
  return globalApp.core
}

/**
 * 從容器取得服務的通用方法
 */
function getFromContainer<T>(key: string): T {
  const core = getCore()
  return core.container.make(key) as T
}

/**
 * 取得全局 QueueManager 實例
 */
export function getQueueManager(): QueueManager {
  return getFromContainer<QueueManager>('queueManager')
}

/**
 * 取得全局 EventAggregator 實例
 */
export function getEventAggregator(): EventAggregator {
  return getFromContainer<EventAggregator>('eventAggregator')
}

/**
 * 取得全局 AsyncInvalidationEngine 實例
 */
export function getAsyncInvalidationEngine(): AsyncInvalidationEngine {
  return getFromContainer<AsyncInvalidationEngine>('invalidationEngine')
}

/**
 * 取得全局 Monitor 實例
 */
export function getMonitorService(): MonitorService {
  return getFromContainer<MonitorService>('monitor')
}

/**
 * 初始化並啟動應用
 */
async function bootstrap(): Promise<void> {
  // 1. 建立 Application 實例
  globalApp = new Application(GravitoConfig)

  const core = globalApp.core

  // 2. 初始化基礎設施 (P0)

  // P0.1：監控系統
  await bootstrapMonitor(core)

  // P0.2：容錯機制
  await bootstrapResilience(core)

  // 3. 註冊服務提供者 (P1)

  // 應用核心服務 (管理 PoolManager, EventAggregator, InvalidationEngine, Routes)
  core.register(new AppServiceProvider())

  // 業務 Satellite 服務
  // 注意：某些 Provider 可能已經被打包，這裡手動註冊實例
  core.register(new FlashSaleServiceProvider())

  // 使用 type-safe 的方式註冊其餘 Provider
  if (InventoryLockServiceProvider) {
    core.register(new (InventoryLockServiceProvider as any)())
  }
  if (PaymentServiceProvider) {
    core.register(new (PaymentServiceProvider as any)())
  }

  // 4. 初始化外部資源

  // 初始化隊列管理器並註冊到容器
  const queueManager = await initializeQueueManager()
  core.container.instance('queueManager', queueManager)

  // 5. 啟動應用 (在 Gravito 2.0+ 中使用 boot)
  await globalApp.boot()

  // 6. 註冊全局中間件 (Hono)
  // 取得 Hono 實例
  const app = core.adapter.native as any
  if (app && typeof app.use === 'function') {
    app.use('*', httpTracingMiddleware)
  }

  core.logger.info('🚀 Flash Sale System is running on port 3000')
}

/**
 * 關閉應用
 */
async function shutdown(): Promise<void> {
  if (globalApp) {
    await globalApp.core.shutdown()
    globalApp = null
  }
}

// 執行啟動
if (import.meta.path === Bun.main) {
  bootstrap().catch((err) => {
    console.error('Fatal error during bootstrap:', err)
    process.exit(1)
  })
}

export { bootstrap, shutdown }

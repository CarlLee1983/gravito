#!/usr/bin/env bun

import { PlanetCore } from '@gravito/core'
import { getLogger } from '@infrastructure/logging/Logger'
import gravitoConfig from './gravito.config'

/**
 * 初始化並啟動 REST API 應用
 */
async function bootstrap(): Promise<void> {
  const logger = getLogger()

  try {
    // =========================================================================
    // 1. 初始化 PlanetCore
    // =========================================================================
    const core = new PlanetCore({ config: gravitoConfig as Record<string, unknown> })

    // =========================================================================
    // 2. 註冊所有 ServiceProvider
    // =========================================================================
    // Phase 2: 資料倉庫（已實現 - Mock 實現）
    core.register(require('./providers/RepositoryServiceProvider').RepositoryServiceProvider)

    // Phase 4: 認證系統（已實現）
    core.register(require('./providers/AuthServiceProvider').AuthServiceProvider)

    // Phase 5: 安全系統（已實現）
    core.register(require('./providers/SecurityServiceProvider').SecurityServiceProvider)

    // Phase 6: 事件驅動系統（已實現）
    core.register(require('./providers/EventServiceProvider').EventServiceProvider)

    // Phase 8: 性能優化系統（已實現）
    core.register(require('./providers/PerformanceServiceProvider').PerformanceServiceProvider)

    // TODO: 在後續 Phase 實現
    // - CacheServiceProvider（Phase 3）
    // - ObservabilityServiceProvider（Phase 7）

    // =========================================================================
    // 3. 啟動應用
    // =========================================================================
    const config = await core.liftoff()

    // =========================================================================
    // 4. 啟動 HTTP 伺服器（Photon）
    // =========================================================================
    Bun.serve({
      port: config.port,
      fetch: config.fetch,
      error: (error: Error) => {
        console.error('Server error:', error)
        return new Response('Internal Server Error', { status: 500 })
      },
    })

    const host = gravitoConfig.http.host
    const port = gravitoConfig.http.port
    const env = gravitoConfig.app.environment
    const baseUrl = `http://${host}:${port}`

    logger.info('✅ REST API Demo 已啟動', {
      address: baseUrl,
      environment: env,
      docsUrl: `${baseUrl}/docs`,
    })

    // =========================================================================
    // 5. 優雅關閉
    // =========================================================================
    const handleShutdown = async (signal: string) => {
      logger.info(`⏹️  收到 ${signal} 信號，開始優雅關閉...`)

      // TODO: 實現優雅關閉邏輯
      // - 停止接受新請求
      // - 等待現有請求完成
      // - 關閉資料庫連接
      // - 關閉 Redis 連接
      // - 停止事件監聽器
      // 等...

      process.exit(0)
    }

    process.on('SIGTERM', () => {
      handleShutdown('SIGTERM').catch((err: Error) => logger.error('關閉失敗', err))
    })
    process.on('SIGINT', () => {
      handleShutdown('SIGINT').catch((err: Error) => logger.error('關閉失敗', err))
    })
  } catch (error) {
    logger.error('❌ 應用啟動失敗', error instanceof Error ? error : new Error(String(error)))
    process.exit(1)
  }
}

// 啟動應用
bootstrap().catch((error: Error) => {
  const logger = getLogger()
  logger.error('啟動失敗', error)
})

#!/usr/bin/env bun

import { PlanetCore } from '@gravito/core'
import gravitoConfig from './gravito.config'

/**
 * 初始化並啟動 REST API 應用
 */
async function bootstrap(): Promise<void> {
  try {
    // =========================================================================
    // 1. 初始化 PlanetCore
    // =========================================================================
    const core = new PlanetCore(gravitoConfig)

    // =========================================================================
    // 2. 註冊所有 ServiceProvider
    // =========================================================================
    // TODO: 在 Phase 2-7 逐步實現各個 Provider
    // - DatabaseServiceProvider
    // - CacheServiceProvider
    // - AuthenticationServiceProvider
    // - EventServiceProvider
    // - ObservabilityServiceProvider
    // 等...

    // =========================================================================
    // 3. 啟動應用
    // =========================================================================
    const config = await core.liftoff()

    // =========================================================================
    // 4. 啟動 HTTP 伺服器（Photon）
    // =========================================================================
    Bun.serve({
      ...config,
      error: (error: Error) => {
        console.error('❌ Server error:', error)
        return new Response('Internal Server Error', { status: 500 })
      },
    })

    const host = gravitoConfig.http.host
    const port = gravitoConfig.http.port
    const env = gravitoConfig.app.environment
    const baseUrl = `http://${host}:${port}`

    console.log(
      `\n✅ REST API Demo 已啟動`,
      `\n📍 地址: ${baseUrl}`,
      `\n🚀 環境: ${env}`,
      `\n📚 API 文檔: ${baseUrl}/docs`
    )

    // =========================================================================
    // 5. 優雅關閉
    // =========================================================================
    const handleShutdown = async (signal: string) => {
      console.log(`\n⏹️  收到 ${signal} 信號，開始優雅關閉...`)

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
      handleShutdown('SIGTERM').catch(console.error)
    })
    process.on('SIGINT', () => {
      handleShutdown('SIGINT').catch(console.error)
    })
  } catch (error) {
    console.error('❌ 應用啟動失敗:', error)
    process.exit(1)
  }
}

// 啟動應用
bootstrap().catch(console.error)

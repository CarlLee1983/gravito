/**
 * Flash Sale System - Main Application Entry Point
 *
 * 搶購系統主應用入口
 */

import { Application } from '@gravito/core'
import { GravitoConfig } from './gravito.config'

/**
 * 初始化並啟動應用
 */
async function bootstrap(): Promise<void> {
  const app = new Application({
    basePath: process.cwd(),
    env: process.env.NODE_ENV || 'development',
  })

  // 載入配置
  app.config.load(GravitoConfig)

  // 啟動應用
  await app.boot()

  // 記錄啟動訊息
  app.core.logger.info('🚀 Flash Sale System started')
  app.core.logger.info(`📍 Environment: ${app.env}`)
  app.core.logger.info(`🌐 Listen on: http://localhost:3000`)
}

// 啟動應用
bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})

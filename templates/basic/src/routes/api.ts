import { Hono } from 'hono'
import { logger } from 'hono/logger'

/**
 * API 路由模組
 *
 * 重要：使用 Hono 的 .route() 方法來串接模組，
 * 這是為了獲得完整 TypeScript 型別推導的必要寫法。
 */
const apiRoute = new Hono()

// API 日誌中間件
apiRoute.use('*', logger())

/**
 * 健康檢查
 * GET /api/health
 */
apiRoute.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

/**
 * 取得設定
 * GET /api/config
 */
apiRoute.get('/config', (c) => {
  return c.json({
    appName: 'Gravito Demo',
    version: '1.0.0',
  })
})

/**
 * 取得統計資訊
 * GET /api/stats
 */
apiRoute.get('/stats', (c) => {
  return c.json({
    users: 100,
    posts: 500,
    views: 10000,
  })
})

export { apiRoute }


import { Hono } from 'hono'
import { logger } from 'hono/logger'

/**
 * API route module.
 *
 * Important: use Hono's `.route()` to compose modules. This is required to preserve full
 * TypeScript type inference.
 */
const apiRoute = new Hono()

// API logging middleware
apiRoute.use('*', logger())

/**
 * Health check
 * GET /api/health
 */
apiRoute.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

/**
 * Get configuration
 * GET /api/config
 */
apiRoute.get('/config', (c) => {
  return c.json({
    appName: 'Gravito Demo',
    version: '1.0.0',
  })
})

/**
 * Get stats
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

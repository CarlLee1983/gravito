import type { PlanetCore } from '@gravito/core'

/**
 * DDD 路由定義
 *
 * Presentation Layer 暴露應用程式接口
 */
export async function registerRoutes(core: PlanetCore) {
  // Health check
  core.router.get('/health', (ctx) => ctx.json({ status: 'ok' }))

  // 應用程式接口示例
  core.router.post('/api/entities', (ctx) => {
    return ctx.json({ message: 'Entity created' })
  })

  core.router.get('/api/entities/:id', (ctx) => {
    return ctx.json({ data: null })
  })
}

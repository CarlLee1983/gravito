import type { PlanetCore } from '@gravito/core'

/**
 * CQRS 路由定義
 *
 * 將端點分為：
 * - Commands: POST/PUT/DELETE - 修改狀態
 * - Queries: GET - 讀取狀態
 */
export async function registerRoutes(core: PlanetCore) {
  // Health check
  core.get('/health', (ctx) => ctx.json({ status: 'ok' }))

  // 示例：Command 端點
  core.post('/commands/create', (ctx) => {
    return ctx.json({ message: 'Command received' })
  })

  // 示例：Query 端點
  core.get('/queries/list', (ctx) => {
    return ctx.json({ data: [] })
  })
}

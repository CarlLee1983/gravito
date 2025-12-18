import { Hono } from 'hono'
import type { InertiaService } from '@gravito/orbit-inertia'
import type { Context } from 'hono'
import type { PlanetCore } from 'gravito-core'

/**
 * 頁面路由模組
 *
 * 重要：使用 Hono 的 .route() 方法來串接模組，
 * 這是為了獲得完整 TypeScript 型別推導的必要寫法。
 */
export function createPagesRoute(core: PlanetCore) {
  const pagesRoute = new Hono()

  /**
   * 首頁
   * GET /
   */
  pagesRoute.get('/', async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService

    return inertia.render('Home', {
      msg: 'Hello from Gravito Backend!',
      version: core.config.get('APP_VERSION'),
    })
  })

  /**
   * 關於頁面
   * GET /about
   */
  pagesRoute.get('/about', async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService
    return inertia.render('About')
  })

  return pagesRoute
}


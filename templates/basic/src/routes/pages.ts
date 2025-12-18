import { Hono } from 'hono'
import type { CacheService, ViewService } from 'gravito-core'
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
    const cache = c.get('cache') as CacheService | undefined
    const count = ((await cache?.get<number>('visitor:count')) ?? 0) + 1
    await cache?.set('visitor:count', count, 86400)

    const view = c.get('view') as ViewService

    return c.html(
      view.render(
        'home',
        {
          visitors: count,
          version: core.config.get('APP_VERSION') as string,
        },
        {
          title: core.config.get('APP_NAME') as string,
          scripts: '<script src="/static/home.js"></script>',
          isHome: true,
        }
      )
    )
  })

  /**
   * 關於頁面
   * GET /about
   */
  pagesRoute.get('/about', async (c: Context) => {
    const view = c.get('view') as ViewService
    return c.html(
      view.render('about', {}, { title: 'About Us', isAbout: true })
    )
  })

  return pagesRoute
}


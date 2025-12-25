import type { Context } from '@gravito/photon'
import { Photon } from '@gravito/photon'
import type { CacheService, PlanetCore, ViewService } from 'gravito-core'

/**
 * Pages route module.
 *
 * Important: use Photon's `.route()` to compose modules. This is required to preserve full
 * TypeScript type inference.
 */
export function createPagesRoute(core: PlanetCore) {
  const pagesRoute = new Photon()

  /**
   * Home page
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
   * About page
   * GET /about
   */
  pagesRoute.get('/about', async (c: Context) => {
    const view = c.get('view') as ViewService
    return c.html(view.render('about', {}, { title: 'About Us', isAbout: true }))
  })

  return pagesRoute
}

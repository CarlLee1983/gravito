import type { CacheService, PlanetCore, ViewService } from 'gravito-core'
import type { Context } from 'hono'

/**
 * HomeController
 * Handles page rendering for the home page
 */
export class HomeController {
  constructor(private core: PlanetCore) {}

  /**
   * GET /
   * Render the home page with visitor count
   */
  index = async (c: Context) => {
    const cache = c.get('cache') as CacheService | undefined
    const count = ((await cache?.get<number>('visitor:count')) ?? 0) + 1
    await cache?.set('visitor:count', count, 86400)

    const view = c.get('view') as ViewService

    return c.html(
      view.render(
        'home',
        {
          visitors: count,
          version: this.core.config.get('APP_VERSION') as string,
        },
        {
          title: this.core.config.get('APP_NAME') as string,
          scripts: '<script src="/static/home.js"></script>',
          isHome: true,
        }
      )
    )
  }

  /**
   * GET /about
   * Render the about page
   */
  about = async (c: Context) => {
    const view = c.get('view') as ViewService
    return c.html(view.render('about', {}, { title: 'About Us', isAbout: true }))
  }
}

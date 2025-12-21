import type { CacheService, GravitoContext, PlanetCore, ViewService } from 'gravito-core'

/**
 * HomeController
 * Handles page rendering for the home page
 */
export class HomeController {
  constructor(private core: PlanetCore) { }

  /**
   * GET /
   * Render the home page with visitor count
   */
  index = async (ctx: GravitoContext) => {
    const cache = ctx.get('cache') as CacheService | undefined
    const count = ((await cache?.get<number>('visitor:count')) ?? 0) + 1
    await cache?.set('visitor:count', count, 86400)

    const view = ctx.get('view') as ViewService

    return ctx.html(
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
  about = async (ctx: GravitoContext) => {
    const view = ctx.get('view') as ViewService
    return ctx.html(view.render('about', {}, { title: 'About Us', isAbout: true }))
  }
}


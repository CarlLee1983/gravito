import type { InertiaService } from '@gravito/orbit-inertia'
import type { PlanetCore } from 'gravito-core'
import type { Context } from 'hono'
import { Hono } from 'hono'

/**
 * Pages route module.
 *
 * Important: use Hono's `.route()` to compose modules. This is required to preserve full
 * TypeScript type inference.
 */
export function createPagesRoute(core: PlanetCore) {
  const pagesRoute = new Hono()

  /**
   * Home page
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
   * About page
   * GET /about
   */
  pagesRoute.get('/about', async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService
    return inertia.render('About')
  })

  return pagesRoute
}

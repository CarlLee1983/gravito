import type { InertiaService } from '@gravito/ion'
import type { Context } from '@gravito/photon'
import { Photon } from '@gravito/photon'
import type { PlanetCore } from 'gravito-core'

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

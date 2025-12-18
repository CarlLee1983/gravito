import type { InertiaService } from '@gravito/orbit-inertia'
import type { PlanetCore } from 'gravito-core'
import type { Context } from 'hono'

export class HomeController {
  constructor(private core: PlanetCore) {}

  index = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService

    return inertia.render('Home', {
      msg: 'Hello from Gravito Backend!',
      version: this.core.config.get('APP_VERSION'),
    })
  }

  about = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService
    return inertia.render('About')
  }
}

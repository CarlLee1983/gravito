import type { InertiaService } from '@gravito/orbit-inertia'
import type { GravitoContext, PlanetCore } from 'gravito-core'

export class HomeController {
  constructor(private core: PlanetCore) { }

  index = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaService

    return inertia.render('Home', {
      msg: 'Hello from Gravito Backend!',
      version: this.core.config.get('APP_VERSION'),
    })
  }

  about = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('About')
  }
}


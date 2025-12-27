import type { InertiaService } from '@gravito/ion'
import type { GravitoContext, PlanetCore } from 'gravito-core'

export class HomeController {
  [key: string]: unknown

  constructor(private core: PlanetCore) {}

  index = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaService

    return inertia.render('Home', {
      msg: 'Hello from Gravito Static Site!',
      version: this.core.config.get('APP_VERSION'),
    })
  }

  about = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('About', {
      version: this.core.config.get('APP_VERSION'),
    })
  }
}

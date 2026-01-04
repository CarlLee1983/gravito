import type { GravitoContext, PlanetCore } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import { getTranslation } from '../services/I18nService'

export class HomeController {
  [key: string]: unknown

  constructor(private core: PlanetCore) {}

  index = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaService
    const locale = (ctx.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('Home', {
      t,
      locale,
      version: this.core.config.get('APP_VERSION'),
    })
  }

  about = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaService
    const locale = (ctx.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('About', {
      t,
      locale,
      version: this.core.config.get('APP_VERSION'),
    })
  }
}

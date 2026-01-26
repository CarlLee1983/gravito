import type { GravitoContext, PlanetCore } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
import { getTranslation } from '../services/I18nService'

export class HomeController {
  [key: string]: unknown

  constructor(private core: PlanetCore) {}

  index = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaHelper
    const locale = (ctx.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('Home', {
      t,
      locale,
      version: this.core.config.get('APP_VERSION'),
    })
  }

  about = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaHelper
    const locale = (ctx.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('About', {
      t,
      locale,
      version: this.core.config.get('APP_VERSION'),
    })
  }

  features = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaHelper
    const locale = (ctx.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('Features', {
      t,
      locale,
      version: this.core.config.get('APP_VERSION'),
    })
  }

  integrations = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaHelper
    const locale = (ctx.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('Integrations', {
      t,
      locale,
      version: this.core.config.get('APP_VERSION'),
    })
  }

  privacy = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaHelper
    const locale = (ctx.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('Privacy', {
      t,
      locale,
      version: this.core.config.get('APP_VERSION'),
    })
  }

  terms = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaHelper
    const locale = (ctx.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('Terms', {
      t,
      locale,
      version: this.core.config.get('APP_VERSION'),
    })
  }

  contact = async (ctx: GravitoContext) => {
    const inertia = ctx.get('inertia') as InertiaHelper
    const locale = (ctx.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('Contact', {
      t,
      locale,
      version: this.core.config.get('APP_VERSION'),
    })
  }
}

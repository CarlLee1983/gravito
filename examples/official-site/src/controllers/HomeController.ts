import type { InertiaService } from '@gravito/orbit-inertia'
import type { PlanetCore } from 'gravito-core'
import type { Context } from 'hono'
import { getTranslation } from '../services/I18nService'

export class HomeController {
  private core: PlanetCore

  constructor(core: PlanetCore) {
    this.core = core
  }

  index = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService
    const locale = (c.get('locale') as string) || 'en'
    const t = getTranslation(locale)

    return inertia.render('Home', { t, locale })
  }

  subscribe = async (c: Context) => {
    const body = (await c.req.json().catch(() => c.req.parseBody())) as { email?: string }
    const email = body.email

    // We can get locale from referrer or hidden input if needed
    // For now, just logging
    if (email) {
      this.core.logger.info(`[Newsletter] New subscriber: ${email}`)
    }

    return c.redirect('back')
  }
}

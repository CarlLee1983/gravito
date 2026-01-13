import { type PlanetCore, ServiceProvider } from '@gravito/core'

export class InertiaServiceProvider extends ServiceProvider {
  boot(core: PlanetCore): void {
    core.adapter.use('*', async (ctx, next) => {
      const inertia = ctx.get('inertia') as any
      const auth = ctx.get('auth') as any
      const session = ctx.get('session') as any
      const i18n = ctx.get('i18n' as any) as any

      // 1. Resolve Active Locale (Priority: URL > Session > Detected)
      const langParam = ctx.req.query('lang')
      let locale = i18n?.getLocale() || 'en'

      if (langParam) {
        locale = String(langParam)
        if (session) session.put('app_locale', locale)
      } else if (session) {
        const saved = session.get('app_locale')
        if (saved) locale = String(saved)
      }

      // 2. Sync with i18n service
      if (i18n) i18n.setLocale(locale)

      if (inertia) {
        // Share Auth State
        const user = auth ? await auth.user() : null
        inertia.share('auth', {
          user: user
            ? {
                id: user.id || user.getAuthIdentifier(),
                name: user.name,
                email: user.email,
                role: user.role,
              }
            : null,
        })

        // Share Flash Messages
        inertia.share('flash', {
          success: session?.getFlash('success'),
          error: session?.getFlash('error'),
        })

        // Share I18n Data
        inertia.share('locale', locale)

        if (i18n) {
          const config = (i18n.manager || i18n).getConfig()
          const translations = (i18n.manager || i18n).translations || config.translations || {}
          inertia.share('translations', translations[locale] || {})
        }
      }

      return await next()
    })
  }

  register(): void {}
}

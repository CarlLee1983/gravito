import { type PlanetCore, ServiceProvider } from '@gravito/core'

export class InertiaServiceProvider extends ServiceProvider {
  boot(core: PlanetCore): void {
    core.adapter.use('*', async (ctx, next) => {
      const inertia = ctx.get('inertia') as any
      const auth = ctx.get('auth') as any
      const session = ctx.get('session') as any
      const i18n = ctx.get('i18n' as any) as any

      // Handle manual language switching
      const lang = ctx.req.query('lang')
      if (lang && session) {
        session.put('app_locale', lang)
        if (i18n) i18n.setLocale(lang)
      } else if (
        session &&
        typeof session.has === 'function' &&
        session.has('app_locale') &&
        i18n
      ) {
        i18n.setLocale(session.get('app_locale'))
      }

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

        // Share I18n
        if (i18n) {
          const locale = i18n.getLocale()
          inertia.share('locale', locale)

          // Access translations through config or internal map safely
          const config = (i18n.manager || i18n).getConfig()
          const allTranslations = config.translations || {}
          inertia.share('translations', allTranslations[locale] || {})
        }
      }

      return await next()
    })
  }

  register(): void {}
}

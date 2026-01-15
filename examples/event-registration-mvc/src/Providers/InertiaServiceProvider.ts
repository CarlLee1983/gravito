import { type PlanetCore, ServiceProvider } from '@gravito/core'

/**
 * HandleInertiaRequests Service Provider
 *
 * Standardized data sharing between Gravito Backend and Inertia Frontend.
 * This handles:
 * - Locale detection and I18n state synchronization
 * - User Authentication state sharing
 * - Flash Message delivery
 * - CSRF Token exposure
 */
export class HandleInertiaRequests extends ServiceProvider {
  boot(core: PlanetCore): void {
    core.adapter.use('*', async (ctx, next) => {
      const inertia = ctx.get('inertia') as any
      const auth = ctx.get('auth') as any
      const session = ctx.get('session') as any
      const i18n = ctx.get('i18n') as any
      const csrf = ctx.get('csrf' as any) as any

      // 1. Resolve Active Locale (Priority: URL > Session > Detected)
      const langParam = ctx.req.query('lang')
      let locale = i18n?.getLocale() || 'en'

      if (langParam) {
        locale = String(langParam)
        if (session) {
          session.put('app_locale', locale)
        }
      } else if (session) {
        const saved = session.get('app_locale')
        if (saved) {
          locale = String(saved)
        }
      }

      // 2. Sync with i18n service
      if (i18n) {
        i18n.setLocale(locale)
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

        // Share CSRF Token
        const csrfToken = typeof csrf?.token === 'function' ? csrf.token() : null
        inertia.share('csrf_token', csrfToken)

        // Root Variables for initial HTML rendering (fixes empty meta tag)
        ctx.set('csrf_token', csrfToken)

        // Share I18n Data
        if (i18n) {
          const config = i18n.getConfig()
          // Access manager translations directly for maximum reliability
          const allTranslations =
            i18n.manager?.translations || i18n.translations || config.translations || {}

          // Find the best matching locale for translations
          let translationLocale = locale
          if (!allTranslations[translationLocale]) {
            const baseLang = locale.split('-')[0]
            if (allTranslations[baseLang]) {
              translationLocale = baseLang
            } else {
              translationLocale = config.defaultLocale || 'en'
            }
          }

          const currentTranslations = allTranslations[translationLocale] || {}

          if (Object.keys(currentTranslations).length === 0) {
            console.error(
              `[HandleInertiaRequests] CRITICAL: No translations found for ${translationLocale}`
            )
          }

          inertia.share('translations', currentTranslations)
          inertia.share('locale', translationLocale)
        }
      }

      return await next()
    })
  }

  register(): void {}
}

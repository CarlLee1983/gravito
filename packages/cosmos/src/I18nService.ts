import type { MiddlewareHandler } from 'hono'

export interface I18nConfig {
  defaultLocale: string
  supportedLocales: string[]
  // Path to translation files, or a Record of translations
  // If undefined, it will look into `resources/lang` by default (conceptually, handled by loader)
  translations?: Record<string, Record<string, string>>
}

export interface I18nService {
  locale: string
  setLocale(locale: string): void
  getLocale(): string
  t(key: string, replacements?: Record<string, string | number>): string
  has(key: string): boolean
}

export class I18nManager implements I18nService {
  private _locale: string
  private translations: Record<string, Record<string, string>> = {}

  constructor(private config: I18nConfig) {
    this._locale = config.defaultLocale
    if (config.translations) {
      this.translations = config.translations
    }
  }

  get locale(): string {
    return this._locale
  }

  set locale(value: string) {
    this.setLocale(value)
  }

  setLocale(locale: string) {
    if (this.config.supportedLocales.includes(locale)) {
      this._locale = locale
    }
  }

  getLocale(): string {
    return this._locale
  }

  /**
   * Add translations for a locale
   */
  addResource(locale: string, translations: Record<string, string>) {
    this.translations[locale] = {
      ...(this.translations[locale] || {}),
      ...translations,
    }
  }

  /**
   * Translation helper
   * t('messages.welcome', { name: 'Carl' })
   * Supports nested keys via dot notation: t('auth.errors.invalid')
   */
  t(key: string, replacements?: Record<string, string | number>): string {
    const keys = key.split('.')
    let value: any = this.translations[this._locale]

    // Fallback to default locale if not found in current locale?
    // Implementation: Try current locale, then fallback.

    // 1. Try current locale
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        value = undefined
        break
      }
    }

    // 2. If not found, try fallback (defaultLocale)
    if (value === undefined && this._locale !== this.config.defaultLocale) {
      let fallbackValue: any = this.translations[this.config.defaultLocale]
      for (const k of keys) {
        if (fallbackValue && typeof fallbackValue === 'object' && k in fallbackValue) {
          fallbackValue = fallbackValue[k]
        } else {
          fallbackValue = undefined
          break
        }
      }
      value = fallbackValue
    }

    if (value === undefined || typeof value !== 'string') {
      return key // Return key if not found
    }

    // 3. Replacements
    if (replacements) {
      for (const [search, replace] of Object.entries(replacements)) {
        value = value.replace(new RegExp(`:${search}`, 'g'), String(replace))
      }
    }

    return value
  }

  has(key: string): boolean {
    // Simplistic check
    return this.t(key) !== key
  }
}

/**
 * Locale Middleware
 *
 * Detects locale from:
 * 1. Route Parameter (e.g. /:locale/foo) - Recommended for SEO
 * 2. Header (Accept-Language) - Recommended for APIs
 */
export const localeMiddleware = (i18n: I18nService): MiddlewareHandler => {
  return async (c, next) => {
    // 1. Check for route param 'locale'
    const paramLocale = c.req.param('locale')
    if (paramLocale) {
      i18n.setLocale(paramLocale)
    }

    // 2. Inject into context (using 'any' for now, or augment PlanetCore variables later)
    c.set('i18n', i18n)

    // 3. Share with View layer (if Orbit View is present)
    // Assuming 'view' service might look at context variables or we explicitly pass it
    // For Inertia, we might want to share it as a prop.
    // This part depends on how the user sets up their detailed pipeline, but setting it in 'c' is the start.

    await next()
  }
}

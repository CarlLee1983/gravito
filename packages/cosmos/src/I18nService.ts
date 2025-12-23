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
  // Create a request-scoped instance
  clone(locale?: string): I18nService
}

/**
 * Request-scoped I18n Instance
 * Holds the state (locale) for a single request, but shares the heavy resources (translations)
 */
export class I18nInstance implements I18nService {
  private _locale: string

  /**
   * Create a new I18nInstance.
   *
   * @param manager - The I18nManager instance.
   * @param initialLocale - The initial locale for this instance.
   */
  constructor(
    private manager: I18nManager,
    initialLocale: string
  ) {
    this._locale = initialLocale
  }

  get locale(): string {
    return this._locale
  }

  set locale(value: string) {
    this.setLocale(value)
  }

  /**
   * Set the current locale.
   *
   * @param locale - The locale to set.
   */
  setLocale(locale: string) {
    if (this.manager.getConfig().supportedLocales.includes(locale)) {
      this._locale = locale
    }
  }

  /**
   * Get the current locale.
   *
   * @returns The current locale string.
   */
  getLocale(): string {
    return this._locale
  }

  /**
   * Translate a key.
   *
   * @param key - The translation key (e.g., 'messages.welcome').
   * @param replacements - Optional replacements for parameters in the translation string.
   * @returns The translated string, or the key if not found.
   */
  t(key: string, replacements?: Record<string, string | number>): string {
    return this.manager.translate(this._locale, key, replacements)
  }

  /**
   * Check if a translation key exists.
   *
   * @param key - The translation key to check.
   * @returns True if the key exists, false otherwise.
   */
  has(key: string): boolean {
    return this.t(key) !== key
  }

  /**
   * Clone the current instance with a potentially new locale.
   *
   * @param locale - Optional new locale for the cloned instance.
   * @returns A new I18nInstance.
   */
  clone(locale?: string): I18nService {
    return new I18nInstance(this.manager, locale || this._locale)
  }
}

/**
 * Global I18n Manager
 * Holds shared configuration and translation resources
 */
export class I18nManager implements I18nService {
  private translations: Record<string, Record<string, string>> = {}
  // Default instance for global usage (e.g. CLI or background jobs)
  private globalInstance: I18nInstance

  /**
   * Create a new I18nManager.
   *
   * @param config - The I18n configuration.
   */
  constructor(private config: I18nConfig) {
    if (config.translations) {
      this.translations = config.translations
    }
    this.globalInstance = new I18nInstance(this, config.defaultLocale)
  }

  // --- I18nService Implementation (Delegates to global instance) ---

  get locale(): string {
    return this.globalInstance.locale
  }

  set locale(value: string) {
    this.globalInstance.locale = value
  }

  /**
   * Set the global locale.
   *
   * @param locale - The locale to set.
   */
  setLocale(locale: string): void {
    this.globalInstance.setLocale(locale)
  }

  /**
   * Get the global locale.
   *
   * @returns The global locale string.
   */
  getLocale(): string {
    return this.globalInstance.getLocale()
  }

  /**
   * Translate a key using the global locale.
   *
   * @param key - The translation key.
   * @param replacements - Optional replacements.
   * @returns The translated string.
   */
  t(key: string, replacements?: Record<string, string | number>): string {
    return this.globalInstance.t(key, replacements)
  }

  /**
   * Check if a translation key exists in the global locale.
   *
   * @param key - The translation key.
   * @returns True if found.
   */
  has(key: string): boolean {
    return this.globalInstance.has(key)
  }

  /**
   * Clone the global instance.
   *
   * @param locale - Optional locale for the clone.
   * @returns A new I18nInstance.
   */
  clone(locale?: string): I18nService {
    return new I18nInstance(this, locale || this.config.defaultLocale)
  }

  // --- Manager Internal API ---

  /**
   * Get the I18n configuration.
   *
   * @returns The configuration object.
   */
  getConfig(): I18nConfig {
    return this.config
  }

  /**
   * Add a resource bundle for a specific locale.
   *
   * @param locale - The locale string.
   * @param translations - The translations object.
   */
  addResource(locale: string, translations: Record<string, string>) {
    this.translations[locale] = {
      ...(this.translations[locale] || {}),
      ...translations,
    }
  }

  /**
   * Internal translation logic used by instances
   */
  translate(locale: string, key: string, replacements?: Record<string, string | number>): string {
    const keys = key.split('.')
    let value: any = this.translations[locale]

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
    if (value === undefined && locale !== this.config.defaultLocale) {
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
}

/**
 * Locale Middleware
 *
 * Detects locale from:
 * 1. Route Parameter (e.g. /:locale/foo) - Recommended for SEO
 * 2. Header (Accept-Language) - Recommended for APIs
 */
export const localeMiddleware = (i18nManager: I18nService): MiddlewareHandler => {
  return async (c, next) => {
    // Determine initial locale
    // Priority: 1. Route Param 2. Query ?lang= 3. Header 4. Default
    let locale = c.req.param('locale') || c.req.query('lang')

    if (!locale) {
      const acceptLang = c.req.header('Accept-Language')
      if (acceptLang) {
        // Simple extraction: 'en-US,en;q=0.9' -> 'en-US'
        locale = acceptLang.split(',')[0]?.trim()
      }
    }

    // Clone a request-scoped instance
    const i18n = i18nManager.clone(locale)

    // Inject into context
    c.set('i18n', i18n)

    await next()
  }
}

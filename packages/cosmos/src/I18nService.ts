import type { GravitoMiddleware } from '@gravito/core'
import { loadLocale } from './loader'

export interface LocaleDetector {
  name: string
  detect(c: any): string | undefined | Promise<string | undefined>
}

/**
 * A map of translations where keys are translation keys and values
 * are either the translated string or a nested map for grouping.
 *
 * @public
 * @since 3.0.0
 */
export type TranslationMap = {
  [key: string]: string | TranslationMap
}

export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends object
        ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
        : `${K}`
    }[keyof T & (string | number)]
  : never

export interface LazyLoadConfig {
  baseDir: string
  preload?: string[]
}

export interface FallbackConfig {
  fallbackChain?: Record<string, string[]>
  onMissingKey?: 'key' | 'empty' | 'throw' | ((key: string, locale: string) => string)
  warnOnMissing?: boolean
}

/**
 * Configuration for the I18n service.
 *
 * @public
 * @since 3.0.0
 */
export interface I18nConfig {
  /** The fallback locale to use when the requested one is not found. */
  defaultLocale: string
  /** List of locales officially supported by the application. */
  supportedLocales: string[]
  /**
   * Optional record of translations indexed by locale.
   * Keys are locale strings (e.g., 'en', 'zh-TW').
   */
  translations?: Record<string, TranslationMap>
  /**
   * Configuration for lazy loading translation files.
   */
  lazyLoad?: LazyLoadConfig
  /**
   * Configuration for fallback strategies.
   */
  fallback?: FallbackConfig
}

/**
 * Interface for the I18n service providing translation capabilities.
 *
 * It allows for setting and getting the current locale, translating strings
 * with optional replacements, and checking for key existence.
 *
 * @public
 * @since 3.0.0
 */
export interface I18nService<Schema = TranslationMap> {
  /** The current active locale. */
  locale: string
  /**
   * Set the active locale for this service instance.
   *
   * @param locale - Valid locale string from supportedLocales.
   */
  setLocale(locale: string): void
  /**
   * Get the current active locale.
   *
   * @returns Current locale string.
   */
  getLocale(): string
  /**
   * Ensure translations for a locale are loaded.
   */
  ensureLocale(locale: string): Promise<void>
  /**
   * Translate a key into the current locale.
   *
   * @param key - The translation key (e.g., 'auth.login_success').
   * @param replacements - Optional placeholders in the format `:key` replaced by values.
   * @returns The translated string, or the key itself if not found.
   *
   * @example
   * ```typescript
   *    i18n.t('messages.hello', { name: 'John' }); // "Hello John"
   *    ```
   */
  t(
    key: NestedKeyOf<Schema> | (string & {}),
    replacements?: Record<string, string | number>
  ): string
  /**
   * Translate multiple keys at once.
   *
   * @param keysOrEntries - Array of keys or [key, replacements] tuples.
   * @returns Map of key -> translated string.
   */
  tMany(
    keysOrEntries: Array<
      | NestedKeyOf<Schema>
      | (string & {})
      | [NestedKeyOf<Schema> | (string & {}), Record<string, string | number>?]
    >
  ): Record<string, string>
  /**
   * Check if a translation key exists for the current locale.
   *
   * @param key - The key to check.
   * @returns True if the key exists, false otherwise.
   */
  has(key: NestedKeyOf<Schema> | (string & {})): boolean
  /**
   * Create a new request-scoped instance of the I18n service.
   *
   * @param locale - Optional initial locale for the new instance.
   * @returns A new I18nService instance.
   */
  clone(locale?: string): I18nService<Schema>

  // State Query
  getLocales(): string[]
  isLocaleLoaded(locale: string): boolean
  getStats(): I18nStats
}

export interface I18nStats {
  localesCount: number
  totalKeys: number
  cacheHitRate: number
  cacheSize: number
}

/**
 * Request-scoped I18n Instance
 * Holds the state (locale) for a single request, but shares the heavy resources (translations)
 */
export class I18nInstance<Schema = TranslationMap> implements I18nService<Schema> {
  private _locale: string

  /**
   * Create a new I18nInstance.
   *
   * @param manager - The I18nManager instance.
   * @param initialLocale - The initial locale for this instance.
   */
  constructor(
    public readonly manager: I18nManager<Schema>,
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
   * Ensure translations for a locale are loaded.
   */
  async ensureLocale(locale: string): Promise<void> {
    return this.manager.ensureLocale(locale)
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
  t(
    key: NestedKeyOf<Schema> | (string & {}),
    replacements?: Record<string, string | number>
  ): string {
    return this.manager.translate(this._locale, key, replacements)
  }

  tMany(
    keysOrEntries: Array<
      | NestedKeyOf<Schema>
      | (string & {})
      | [NestedKeyOf<Schema> | (string & {}), Record<string, string | number>?]
    >
  ): Record<string, string> {
    const result: Record<string, string> = {}
    for (const item of keysOrEntries) {
      if (typeof item === 'string') {
        result[item] = this.t(item)
      } else {
        const [key, replacements] = item
        result[key] = this.t(key, replacements)
      }
    }
    return result
  }

  /**
   * Check if a translation key exists.
   *
   * @param key - The translation key to check.
   * @returns True if the key exists, false otherwise.
   */
  has(key: NestedKeyOf<Schema> | (string & {})): boolean {
    return this.t(key) !== key
  }

  /**
   * Clone the current instance with a potentially new locale.
   *
   * @param locale - Optional new locale for the cloned instance.
   * @returns A new I18nInstance.
   */
  clone(locale?: string): I18nService<Schema> {
    return new I18nInstance(this.manager, locale || this._locale)
  }

  /**
   * Get the I18n configuration.
   */
  getConfig(): I18nConfig {
    return this.manager.getConfig()
  }

  /**
   * Get the translations.
   */
  get translations(): Record<string, TranslationMap> {
    return this.manager.translations
  }

  getLocales(): string[] {
    return this.manager.getLocales()
  }

  isLocaleLoaded(locale: string): boolean {
    return this.manager.isLocaleLoaded(locale)
  }

  getStats(): I18nStats {
    return this.manager.getStats()
  }
}

/**
 * Global I18n Manager
 * Holds shared configuration and translation resources
 */
export class I18nManager<Schema = TranslationMap> implements I18nService<Schema> {
  public translations: Record<string, TranslationMap> = {}
  private cache = new Map<string, string>()
  private pluralRules = new Map<string, Intl.PluralRules>()
  private loadedLocales = new Set<string>()
  private cacheHits = 0
  private cacheMisses = 0
  // Default instance for global usage (e.g. CLI or background jobs)
  private globalInstance: I18nInstance<Schema>

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
  t(
    key: NestedKeyOf<Schema> | (string & {}),
    replacements?: Record<string, string | number>
  ): string {
    return this.globalInstance.t(key, replacements)
  }

  tMany(
    keysOrEntries: Array<
      | NestedKeyOf<Schema>
      | (string & {})
      | [NestedKeyOf<Schema> | (string & {}), Record<string, string | number>?]
    >
  ): Record<string, string> {
    return this.globalInstance.tMany(keysOrEntries)
  }

  /**
   * Check if a translation key exists in the global locale.
   *
   * @param key - The translation key.
   * @returns True if found.
   */
  has(key: NestedKeyOf<Schema> | (string & {})): boolean {
    return this.globalInstance.has(key)
  }

  /**
   * Clone the global instance.
   *
   * @param locale - Optional locale for the clone.
   * @returns A new I18nInstance.
   */
  clone(locale?: string): I18nService<Schema> {
    return new I18nInstance(this, locale || this.config.defaultLocale)
  }

  getLocales(): string[] {
    return Object.keys(this.translations)
  }

  isLocaleLoaded(locale: string): boolean {
    return this.loadedLocales.has(locale) || locale in this.translations
  }

  getStats(): I18nStats {
    const totalKeys = Object.values(this.translations).reduce((acc, map) => {
      // Very rough estimate of keys, deep counting is expensive
      return acc + Object.keys(map).length
    }, 0)

    const totalRequests = this.cacheHits + this.cacheMisses
    const cacheHitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0

    return {
      localesCount: Object.keys(this.translations).length,
      totalKeys,
      cacheHitRate,
      cacheSize: this.cache.size,
    }
  }

  /**
   * Ensure translations for a locale are loaded.
   */
  async ensureLocale(locale: string): Promise<void> {
    // If already loaded or no lazy load config, skip
    if (this.loadedLocales.has(locale) || !this.config.lazyLoad) {
      return
    }

    // Attempt to load
    const translations = await loadLocale(this.config.lazyLoad.baseDir, locale)
    if (translations) {
      this.addResource(locale, translations)
      this.loadedLocales.add(locale)
    } else {
      // Mark as loaded even if failed/empty to prevent repeated attempts?
      // Maybe not, in case it appears later. But for performance, maybe yes.
      // For now, let's just not add it to loadedLocales so we retry.
    }
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
  addResource(locale: string, translations: TranslationMap) {
    this.translations[locale] = {
      ...(this.translations[locale] || {}),
      ...translations,
    }
    this.invalidateCache(locale)
  }

  private invalidateCache(locale?: string) {
    if (locale) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${locale}:`)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  private getPluralForm(locale: string, count: number): string {
    if (!this.pluralRules.has(locale)) {
      this.pluralRules.set(locale, new Intl.PluralRules(locale))
    }
    return this.pluralRules.get(locale)!.select(count)
  }

  private resolveKey(locale: string, key: string): string | TranslationMap | undefined {
    const keys = key.split('.')
    let value: string | TranslationMap | undefined = this.translations[locale]

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as TranslationMap)[k]
      } else {
        return undefined
      }
    }
    return value
  }

  private resolveFallback(locale: string, key: string): string | TranslationMap | undefined {
    const chain = this.config.fallback?.fallbackChain?.[locale] ?? [this.config.defaultLocale]

    for (const fallbackLocale of chain) {
      // Avoid infinite recursion if fallback points to itself
      if (fallbackLocale === locale) continue

      const value = this.resolveKey(fallbackLocale, key)
      if (value !== undefined) {
        return value
      }
    }

    return undefined
  }

  private handleMissingKey(key: string, locale: string): string {
    const handler = this.config.fallback?.onMissingKey ?? 'key'

    if (this.config.fallback?.warnOnMissing) {
      console.warn(`[i18n] Missing translation: ${key} (${locale})`)
    }

    if (typeof handler === 'function') {
      return handler(key, locale)
    }

    switch (handler) {
      case 'empty':
        return ''
      case 'throw':
        throw new Error(`Missing translation: ${key}`)
      default:
        return key
    }
  }

  /**
   * Internal translation logic used by instances
   */
  translate(locale: string, key: string, replacements?: Record<string, string | number>): string {
    const cacheKey = `${locale}:${key}`
    let value: string | TranslationMap | undefined

    if (this.cache.has(cacheKey)) {
      this.cacheHits++
      value = this.cache.get(cacheKey)
    } else {
      this.cacheMisses++

      // 1. Try current locale
      value = this.resolveKey(locale, key)

      // 2. Fallback
      if (value === undefined) {
        value = this.resolveFallback(locale, key)
      }

      if (value !== undefined && typeof value === 'string') {
        this.cache.set(cacheKey, value)
      }
    }

    // Pluralization
    if (value && typeof value === 'object' && replacements?.count !== undefined) {
      const count = Number(replacements.count)
      const pluralMap = value as TranslationMap
      const form = this.getPluralForm(locale, count)

      if (count === 0 && 'zero' in pluralMap) {
        value = pluralMap.zero
      } else if (form in pluralMap) {
        value = pluralMap[form]
      } else if ('other' in pluralMap) {
        value = pluralMap.other
      }
    }

    if (value === undefined) {
      return this.handleMissingKey(key, locale)
    }

    if (typeof value !== 'string') {
      // If it resolved to an object but no plural replacement happened (or plural selection failed to find string)
      // For backwards compat, if it is an object, maybe return key? Or some string representation?
      // Old logic returned key if !== string.
      return key
    }

    if (replacements && Object.keys(replacements).length > 0) {
      value = value.replace(REPLACEMENT_REGEX, (match, key) => {
        return (replacements as Record<string, unknown>)[key] !== undefined
          ? String((replacements as Record<string, unknown>)[key])
          : match
      })
    }

    return value
  }
}

const REPLACEMENT_REGEX = /:([a-zA-Z0-9_]+)/g

export const RouteParamDetector: LocaleDetector = {
  name: 'routeParam',
  detect: (c) => c.req.param('locale'),
}

export const QueryDetector: LocaleDetector = {
  name: 'query',
  detect: (c) => c.req.query('lang'),
}

export const HeaderDetector: LocaleDetector = {
  name: 'header',
  detect: (c) => {
    const acceptLang = c.req.header('Accept-Language')
    if (acceptLang) {
      return acceptLang.split(',')[0]?.trim()
    }
    return undefined
  },
}

export const DefaultDetectors = [RouteParamDetector, QueryDetector, HeaderDetector]

export const localeMiddleware = (
  i18nManager: I18nService,
  detectors: LocaleDetector[] = DefaultDetectors
): GravitoMiddleware => {
  return async (c, next) => {
    let locale: string | undefined

    for (const detector of detectors) {
      const result = await detector.detect(c)
      if (result) {
        locale = result
        break
      }
    }

    if (locale) {
      await i18nManager.ensureLocale(locale)
    }

    // Clone a request-scoped instance
    const i18n = i18nManager.clone(locale)

    // Inject into context
    c.set('i18n', i18n)

    return await next()
  }
}

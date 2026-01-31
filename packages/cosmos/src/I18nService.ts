/**
 * @file packages/cosmos/src/I18nService.ts
 * @module @gravito/cosmos/service
 * @description Core services and interfaces for internationalization.
 */

import type { GravitoMiddleware } from '@gravito/core'
import { LRUCache } from 'lru-cache'
import { type HMRConfig, HMRWatcher } from './HMRWatcher'
import { loadLocale } from './loader'
import type { TranslationLoader } from './loaders/TranslationLoader'

/**
 * Interface for locale detectors used to determine the user's preferred locale from a request context.
 *
 * @public
 * @since 3.0.0
 */
export interface LocaleDetector {
  /** The unique name of the detector (e.g., 'query', 'header'). */
  name: string
  /**
   * Detect the locale from the given context.
   *
   * @param c - The application context (e.g., Hono context).
   * @returns The detected locale string, or undefined if not found.
   */
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

/**
 * Utility type to extract all possible dot-notation keys from a nested translation schema.
 *
 * @template T - The translation schema object.
 * @public
 */
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends object
        ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
        : `${K}`
    }[keyof T & (string | number)]
  : never

/**
 * Configuration for lazy loading translation files.
 *
 * @public
 */
export interface LazyLoadConfig {
  /** The base directory where translation files are located. */
  baseDir: string
  /** Optional list of locales to preload on startup. */
  preload?: string[]
  /**
   * Custom loader function for testing or specialized loading strategies.
   * If not provided, defaults to the filesystem loader.
   *
   * @deprecated 自 v3.1.0 起建議使用 loaders 陣列
   */
  loader?: (baseDir: string, locale: string) => Promise<Record<string, string> | null>
}

/**
 * Configuration for translation fallback strategies.
 *
 * @public
 */
export interface FallbackConfig {
  /**
   * Custom fallback chains for specific locales.
   * Key is the requested locale, value is an array of fallback locales.
   */
  fallbackChain?: Record<string, string[]>
  /**
   * Strategy to use when a translation key is missing.
   * - 'key': Return the key itself (default).
   * - 'empty': Return an empty string.
   * - 'throw': Throw an error.
   * - (key, locale) => string: Custom handler function.
   */
  onMissingKey?: 'key' | 'empty' | 'throw' | ((key: string, locale: string) => string)
  /** Whether to log a warning when a key is missing. */
  warnOnMissing?: boolean
}

/**
 * Configuration for the I18n service.
 *
 * @public
 * @since 3.0.0
 */
export interface I18nConfig {
  /** The default locale to use when no locale is detected or for fallbacks. */
  defaultLocale: string
  /** List of locales officially supported by the application. */
  supportedLocales: string[]
  /**
   * Static translations indexed by locale.
   * Keys are locale strings (e.g., 'en', 'zh-TW').
   */
  translations?: Record<string, TranslationMap>
  /**
   * Configuration for lazy loading translation files from the filesystem.
   */
  lazyLoad?: LazyLoadConfig
  /**
   * Configuration for fallback strategies and missing key handling.
   */
  fallback?: FallbackConfig
  /**
   * 翻譯載入器陣列
   *
   * 支援多個載入器的鏈式組合,實現降級策略
   * 當第一個載入器失敗時,會自動嘗試下一個載入器
   *
   * @since 3.1.0
   *
   * @example
   * ```typescript
   * import { FileSystemLoader, RemoteLoader } from '@gravito/cosmos'
   *
   * const config: I18nConfig = {
   *   defaultLocale: 'zh-TW',
   *   supportedLocales: ['zh-TW', 'en'],
   *   loaders: [
   *     new FileSystemLoader({ baseDir: './lang' }),
   *     new RemoteLoader({ url: 'https://api.example.com/i18n/:locale' })
   *   ]
   * }
   * ```
   */
  loaders?: TranslationLoader[]
  /**
   * HMR (熱重載) 配置
   *
   * 在開發模式下啟用,可以在翻譯檔案變更時自動重新載入
   *
   * @since 3.1.0
   *
   * @example
   * ```typescript
   * const config: I18nConfig = {
   *   defaultLocale: 'zh-TW',
   *   supportedLocales: ['zh-TW', 'en'],
   *   hmr: {
   *     enabled: process.env.NODE_ENV === 'development',
   *     watchDirs: ['./lang'],
   *     debounce: 300
   *   }
   * }
   * ```
   */
  hmr?: HMRConfig
}

/**
 * Statistics about the I18n service state and performance.
 *
 * @public
 */
export interface I18nStats {
  /** Number of locales currently loaded. */
  localesCount: number
  /** Estimated total number of translation keys across all locales. */
  totalKeys: number
  /** Percentage of translation requests served from cache. */
  cacheHitRate: number
  /** Number of entries currently in the translation cache. */
  cacheSize: number
}

/**
 * Interface for the I18n service providing translation capabilities.
 *
 * It allows for setting and getting the current locale, translating strings
 * with optional replacements, and checking for key existence.
 *
 * @template Schema - The translation schema for type-safe keys.
 * @public
 * @since 3.0.0
 */
export interface I18nService<Schema = TranslationMap> {
  /** The current active locale for this instance. */
  locale: string
  /**
   * Set the active locale for this service instance.
   *
   * @param locale - Valid locale string from supportedLocales.
   * @throws Error if locale is not supported (depending on implementation).
   */
  setLocale(locale: string): void
  /**
   * Get the current active locale.
   *
   * @returns Current locale string.
   */
  getLocale(): string
  /**
   * Ensure translations for a locale are loaded (useful for lazy loading).
   *
   * @param locale - The locale to load.
   * @returns Promise that resolves when loading is complete.
   */
  ensureLocale(locale: string): Promise<void>
  /**
   * Translate a key into the current locale.
   *
   * Supports parameter replacement using `:key` syntax and pluralization
   * if a `count` parameter is provided.
   *
   * @param key - The translation key (e.g., 'auth.login_success').
   * @param replacements - Optional placeholders replaced by values.
   * @returns The translated string, or the key itself if not found.
   *
   * @example
   * ```typescript
   * i18n.t('messages.hello', { name: 'John' }); // "Hello John"
   * i18n.t('items.count', { count: 5 }); // "5 items"
   * ```
   */
  t(
    key: NestedKeyOf<Schema> | (string & {}),
    replacements?: Record<string, string | number>
  ): string
  /**
   * Translate multiple keys at once.
   *
   * @param keysOrEntries - Array of keys or [key, replacements] tuples.
   * @returns Object mapping each key to its translated string.
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
   * This is typically used in middleware to provide a fresh instance per request
   * that shares the same translation resources but has its own locale state.
   *
   * @param locale - Optional initial locale for the new instance.
   * @returns A new I18nService instance.
   */
  clone(locale?: string): I18nService<Schema>

  /**
   * Get list of all currently loaded locales.
   * @returns Array of locale strings.
   */
  getLocales(): string[]
  /**
   * Check if translations for a specific locale are already loaded.
   * @param locale - Locale to check.
   * @returns True if loaded.
   */
  isLocaleLoaded(locale: string): boolean
  /**
   * Get performance and usage statistics.
   * @returns I18nStats object.
   */
  getStats(): I18nStats
}

/**
 * Request-scoped I18n Instance.
 *
 * Holds the state (current locale) for a single request, but shares the heavy
 * resources (translation bundles) through the central I18nManager.
 *
 * @template Schema - The translation schema for type-safe keys.
 * @public
 * @since 3.0.0
 */
export class I18nInstance<Schema = TranslationMap> implements I18nService<Schema> {
  /** The current active locale for this instance. */
  private _locale: string

  /**
   * Create a new I18nInstance.
   *
   * @param manager - The central I18nManager instance.
   * @param initialLocale - The initial locale for this instance.
   */
  constructor(
    public readonly manager: I18nManager<Schema>,
    initialLocale: string
  ) {
    this._locale = initialLocale
  }

  /**
   * Get the current active locale.
   */
  get locale(): string {
    return this._locale
  }

  /**
   * Set the current active locale.
   */
  set locale(value: string) {
    this.setLocale(value)
  }

  /**
   * Set the active locale for this instance.
   *
   * Validates that the locale is among the supported locales defined in config.
   *
   * @param locale - Valid locale string from supportedLocales.
   */
  setLocale(locale: string) {
    if (this.manager.getConfig().supportedLocales.includes(locale)) {
      this._locale = locale
    }
  }

  /**
   * Ensure translations for a locale are loaded.
   *
   * Delegates to the manager's loading mechanism (e.g., filesystem read).
   *
   * @param locale - Locale to load.
   */
  async ensureLocale(locale: string): Promise<void> {
    return this.manager.ensureLocale(locale)
  }

  /**
   * Get the current locale string.
   *
   * @returns Current locale.
   */
  getLocale(): string {
    return this._locale
  }

  /**
   * Translate a key into the current locale.
   *
   * Supports parameter replacement and pluralization.
   *
   * @param key - The translation key (dot notation supported).
   * @param replacements - Key-value pairs for parameter replacement.
   * @returns The translated string.
   */
  t(
    key: NestedKeyOf<Schema> | (string & {}),
    replacements?: Record<string, string | number>
  ): string {
    return this.manager.translate(this._locale, key, replacements)
  }

  /**
   * Translate multiple keys at once for the current locale.
   *
   * @param keysOrEntries - Array of keys or [key, replacements] tuples.
   * @returns Map of key to translated string.
   */
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
   * Check if a translation key exists for the current locale.
   *
   * @param key - Key to check.
   * @returns True if key exists.
   */
  has(key: NestedKeyOf<Schema> | (string & {})): boolean {
    return this.t(key) !== key
  }

  /**
   * Clone the current instance with a potentially new locale.
   *
   * Shares the same manager and underlying resources.
   *
   * @param locale - Optional new locale for the clone.
   * @returns A new I18nInstance.
   */
  clone(locale?: string): I18nService<Schema> {
    return new I18nInstance(this.manager, locale || this._locale)
  }

  /**
   * Get the current I18n configuration from the manager.
   * @returns I18nConfig
   */
  getConfig(): I18nConfig {
    return this.manager.getConfig()
  }

  /**
   * Access the central translation bundles.
   */
  get translations(): Record<string, TranslationMap> {
    return this.manager.translations
  }

  /**
   * Get list of all currently loaded locales.
   */
  getLocales(): string[] {
    return this.manager.getLocales()
  }

  /**
   * Check if translations for a specific locale are already loaded.
   */
  isLocaleLoaded(locale: string): boolean {
    return this.manager.isLocaleLoaded(locale)
  }

  /**
   * Get performance and usage statistics.
   */
  getStats(): I18nStats {
    return this.manager.getStats()
  }
}

/**
 * Global I18n Manager.
 *
 * The central hub for internationalization. Holds configuration, shared translation
 * resources, pluralization rules, and handles the actual translation logic
 * including fallbacks and caching.
 *
 * @template Schema - The translation schema for type-safe keys.
 * @public
 * @since 3.0.0
 */
export class I18nManager<Schema = TranslationMap> implements I18nService<Schema> {
  /** Map of translation bundles indexed by locale. */
  public translations: Record<string, TranslationMap> = {}
  /** Internal cache for resolved translation strings. */
  private cache: LRUCache<string, string>
  /** Cache for Intl.PluralRules instances. */
  private pluralRules = new Map<string, Intl.PluralRules>()
  /** Set of locales that have been successfully loaded. */
  private loadedLocales = new Set<string>()
  /** Map of pending locale load promises for coalescing. */
  private loadingPromises = new Map<string, Promise<void>>()
  /** Counter for cache hits. */
  private cacheHits = 0
  /** Counter for cache misses. */
  private cacheMisses = 0
  /** Default instance for global/CLI usage. */
  private globalInstance: I18nInstance<Schema>
  /** HMR watcher for development mode. */
  private hmrWatcher?: HMRWatcher

  /**
   * Create a new I18nManager.
   *
   * @param config - The I18n configuration.
   */
  constructor(private config: I18nConfig) {
    if (config.translations) {
      this.translations = config.translations
    }
    this.cache = new LRUCache<string, string>({
      max: 10000,
      ttl: 1000 * 60 * 60, // 1 hour
    })
    this.globalInstance = new I18nInstance(this, config.defaultLocale)

    // 初始化 HMR
    if (config.hmr?.enabled) {
      this.hmrWatcher = new HMRWatcher(config.hmr)
      this.hmrWatcher.onChange(async ({ locale }) => {
        await this.reloadLocale(locale)
      })
      this.hmrWatcher.start()
    }
  }

  // --- I18nService Implementation (Delegates to global instance) ---

  /** The global active locale. */
  get locale(): string {
    return this.globalInstance.locale
  }

  set locale(value: string) {
    this.globalInstance.locale = value
  }

  /**
   * Set the global locale.
   * @param locale - Locale string.
   */
  setLocale(locale: string): void {
    this.globalInstance.setLocale(locale)
  }

  /**
   * Get the global locale.
   */
  getLocale(): string {
    return this.globalInstance.getLocale()
  }

  /**
   * Translate a key using the global locale.
   *
   * @param key - Translation key.
   * @param replacements - Replacement parameters.
   */
  t(
    key: NestedKeyOf<Schema> | (string & {}),
    replacements?: Record<string, string | number>
  ): string {
    return this.globalInstance.t(key, replacements)
  }

  /**
   * Translate multiple keys at once using the global locale.
   */
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
   */
  has(key: NestedKeyOf<Schema> | (string & {})): boolean {
    return this.globalInstance.has(key)
  }

  /**
   * Create a request-scoped I18nInstance from this manager.
   *
   * @param locale - Optional initial locale.
   */
  clone(locale?: string): I18nService<Schema> {
    return new I18nInstance(this, locale || this.config.defaultLocale)
  }

  /**
   * Get list of all currently loaded locales.
   */
  getLocales(): string[] {
    return Object.keys(this.translations)
  }

  /**
   * Check if translations for a specific locale are already loaded.
   */
  isLocaleLoaded(locale: string): boolean {
    return this.loadedLocales.has(locale) || locale in this.translations
  }

  /**
   * Get performance and usage statistics.
   */
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
   * Ensure translations for a locale are loaded from the filesystem if lazy loading is enabled.
   *
   * @param locale - Locale to load.
   */
  async ensureLocale(locale: string): Promise<void> {
    // If already loaded, skip
    if (this.loadedLocales.has(locale)) {
      return
    }

    // Check for pending load promise to coalesce requests
    if (this.loadingPromises.has(locale)) {
      return this.loadingPromises.get(locale)
    }

    // Create a new load promise
    const loadPromise = (async () => {
      try {
        let translations: TranslationMap | null = null

        // 優先使用新的 loaders 配置
        if (this.config.loaders && this.config.loaders.length > 0) {
          // 嘗試每個載入器,直到成功載入
          for (const loader of this.config.loaders) {
            translations = await loader.load(locale)
            if (translations) {
              break
            }
          }
        }
        // 向後相容:使用舊的 lazyLoad 配置
        else if (this.config.lazyLoad) {
          const loaderFn = this.config.lazyLoad.loader || loadLocale
          translations = await loaderFn(this.config.lazyLoad.baseDir, locale)
        }

        if (translations) {
          this.addResource(locale, translations)
          this.loadedLocales.add(locale)
        }
      } finally {
        this.loadingPromises.delete(locale)
      }
    })()

    this.loadingPromises.set(locale, loadPromise)
    return loadPromise
  }

  // --- Manager Internal API ---

  /**
   * Get the current shared I18n configuration.
   */
  getConfig(): I18nConfig {
    return this.config
  }

  /**
   * Add or merge a resource bundle for a specific locale.
   *
   * @param locale - The locale string (e.g., 'en', 'fr').
   * @param translations - The translation map to merge into the existing bundle.
   *
   * @example
   * ```typescript
   * manager.addResource('es', {
   *   greeting: 'Hola',
   *   auth: { login: 'Iniciar sesión' }
   * });
   * ```
   */
  addResource(locale: string, translations: TranslationMap) {
    this.translations[locale] = {
      ...(this.translations[locale] || {}),
      ...translations,
    }
    this.invalidateCache(locale)
  }

  /**
   * Invalidate the translation cache.
   *
   * @param locale - If provided, only invalidates keys for this locale.
   */
  private invalidateCache(locale?: string) {
    if (locale) {
      // LRUCache doesn't support iterating keys efficiently in all versions,
      // but newer versions (v7+) are Map-like.
      // However, iterating over cache to delete by prefix is expensive.
      // For now, we clear everything for simplicity and correctness, or we assume keys are iterable.
      // lru-cache v11 (installed) supports keys().
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${locale}:`)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  /**
   * 重新載入指定語言的翻譯資源
   *
   * 會清除該語言的快取並重新從載入器載入
   * 主要用於 HMR 和手動重新載入場景
   *
   * @param locale - 要重新載入的語言代碼
   * @returns Promise that resolves when reloading is complete
   * @public
   * @since 3.1.0
   *
   * @example
   * ```typescript
   * // 手動重新載入某個語言
   * await i18nManager.reloadLocale('zh-TW')
   *
   * // HMR 自動觸發重新載入
   * hmrWatcher.onChange(({ locale }) => {
   *   i18nManager.reloadLocale(locale)
   * })
   * ```
   */
  async reloadLocale(locale: string): Promise<void> {
    // 清除已載入標記
    this.loadedLocales.delete(locale)
    // 清除快取
    this.invalidateCache(locale)
    // 重新載入
    return this.ensureLocale(locale)
  }

  /**
   * Get the plural form for a locale and count.
   */
  private getPluralForm(locale: string, count: number): string {
    if (!this.pluralRules.has(locale)) {
      this.pluralRules.set(locale, new Intl.PluralRules(locale))
    }
    return this.pluralRules.get(locale)?.select(count)
  }

  /**
   * Resolve a dot-notation key to its value in a specific locale.
   */
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

  /**
   * Resolve a key using the configured fallback chain.
   */
  private resolveFallback(locale: string, key: string): string | TranslationMap | undefined {
    const chain = this.config.fallback?.fallbackChain?.[locale] ?? [this.config.defaultLocale]

    for (const fallbackLocale of chain) {
      // Avoid infinite recursion if fallback points to itself
      if (fallbackLocale === locale) {
        continue
      }

      const value = this.resolveKey(fallbackLocale, key)
      if (value !== undefined) {
        return value
      }
    }

    return undefined
  }

  /**
   * Handle cases where a translation key is missing after fallbacks.
   */
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
   * The core translation logic. Handles caching, key resolution, fallbacks,
   * pluralization, and parameter replacement.
   *
   * @param locale - Locale to translate into.
   * @param key - Translation key.
   * @param replacements - Placeholder replacements.
   * @returns Translated string.
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

/** Regex for finding placeholders in translation strings. */
const REPLACEMENT_REGEX = /:([a-zA-Z0-9_]+)/g

/**
 * Detector that extracts the locale from a route parameter named 'locale'.
 *
 * @example
 * ```typescript
 * // router.get('/:locale/home', ...)
 * ```
 * @public
 */
export const RouteParamDetector: LocaleDetector = {
  name: 'routeParam',
  detect: (c) => c.req.param('locale'),
}

/**
 * Detector that extracts the locale from a query parameter named 'lang'.
 *
 * @example
 * ```typescript
 * // GET /home?lang=zh-TW
 * ```
 * @public
 */
export const QueryDetector: LocaleDetector = {
  name: 'query',
  detect: (c) => c.req.query('lang'),
}

/**
 * Detector that extracts the locale from the 'Accept-Language' HTTP header.
 *
 * Picks the first (preferred) language from the comma-separated list.
 *
 * @public
 */
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

/**
 * Default list of detectors used by the middleware.
 * Order: Route Parameter > Query Parameter > Accept-Language Header.
 *
 * @public
 */
export const DefaultDetectors = [RouteParamDetector, QueryDetector, HeaderDetector]

/**
 * Middleware for Gravito/Photon that handles request-scoped internationalization.
 *
 * It uses a list of detectors to determine the locale, ensures it is loaded,
 * and injects a request-scoped `I18nService` instance into the context under the key 'i18n'.
 *
 * @param i18nManager - The central I18nManager instance.
 * @param detectors - Optional custom list of detectors.
 * @returns GravitoMiddleware
 *
 * @public
 */
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

import type { GravitoMiddleware, GravitoOrbit, PlanetCore } from '@gravito/core'
import { type I18nConfig, I18nManager, type I18nService, localeMiddleware } from './I18nService'

declare module '@gravito/core' {
  interface GravitoVariables {
    /** I18n service for translations */
    i18n: I18nService
  }
}

/**
 * OrbitCosmos provides internationalization (i18n) support for Gravito.
 * It manages translations, locale switching, and provides a middleware for request-scoped locale detection.
 *
 * @example
 * ```typescript
 * const cosmos = new OrbitCosmos({
 *   defaultLocale: 'en',
 *   supportedLocales: ['en', 'zh-TW'],
 *   translations: {
 *     en: { welcome: 'Welcome!' },
 *     'zh-TW': { welcome: '歡迎！' }
 *   }
 * });
 * core.addOrbit(cosmos);
 * ```
 * @public
 */
export class OrbitCosmos implements GravitoOrbit {
  /**
   * Create a new OrbitCosmos instance.
   * @param config - The i18n configuration options.
   */
  constructor(private config: I18nConfig) { }

  /**
   * Install the i18n service into PlanetCore.
   * Registers the I18nManager and sets up the locale middleware.
   *
   * @param core - The PlanetCore instance.
   */
  install(core: PlanetCore): void {
    const i18nManager = new I18nManager(this.config)

    // Register globally for CLI/Jobs using the container
    core.container.instance('i18n', i18nManager)

    // Inject locale middleware into every request
    // This middleware handles cloning the i18n instance per request
    core.adapter.use('*', localeMiddleware(i18nManager) as unknown as GravitoMiddleware)

    core.logger.info(`[OrbitCosmos] I18n initialized with locale: ${this.config.defaultLocale}`)
  }
}

/**
 * @deprecated Use OrbitCosmos instead. Will be removed in v4.0.0.
 */
export const I18nOrbit = OrbitCosmos

export * from './I18nService'
export * from './loader'

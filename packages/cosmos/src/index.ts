/**
 * @file packages/cosmos/src/index.ts
 * @module @gravito/cosmos
 * @description Entry point for the Gravito Cosmos internationalization module.
 */

import type { GravitoMiddleware, GravitoOrbit, PlanetCore } from '@gravito/core'
import { type I18nConfig, I18nManager, type I18nService, localeMiddleware } from './I18nService'

declare module '@gravito/core' {
  interface GravitoVariables {
    /**
     * The request-scoped I18n service instance.
     * Provides translation and locale management for the current request.
     */
    i18n: I18nService
  }
}

/**
 * OrbitCosmos provides internationalization (i18n) support for the Gravito framework.
 *
 * It manages global translation resources, handles locale detection through middleware,
 * and provides request-scoped i18n instances.
 *
 * @example
 * ```typescript
 * import { OrbitCosmos } from '@gravito/cosmos'
 *
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
 * @since 3.0.0
 */
export class OrbitCosmos implements GravitoOrbit {
  /**
   * Create a new OrbitCosmos instance.
   *
   * @param config - The i18n configuration options including locales and translations.
   */
  constructor(private config: I18nConfig) {}

  /**
   * Install the i18n service into PlanetCore.
   *
   * This method:
   * 1. Initializes the central `I18nManager`.
   * 2. Registers the manager in the IoC container as 'i18n'.
   * 3. Injects the `localeMiddleware` into the adapter for all routes.
   *
   * @param core - The PlanetCore instance to install into.
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

export * from './HMRWatcher'
export * from './I18nService'
export * from './loader'
export * from './loaders/ChainedLoader'
export * from './loaders/FileSystemLoader'
export * from './loaders/RemoteLoader'
export * from './loaders/TranslationLoader'

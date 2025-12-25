import type { GravitoMiddleware, GravitoOrbit, PlanetCore } from 'gravito-core'
import { type I18nConfig, I18nManager, type I18nService, localeMiddleware } from './I18nService'

declare module 'gravito-core' {
  interface Variables {
    i18n: I18nService
  }
}

/**
 * OrbitCosmos - Internationalization Orbit
 *
 * Provides i18n functionality for Gravito applications.
 */
export class OrbitCosmos implements GravitoOrbit {
  constructor(private config: I18nConfig) {}

  install(core: PlanetCore): void {
    const i18nManager = new I18nManager(this.config)

    // Register globally if needed (for CLI/Jobs)
    // core.services.set('i18n', i18nManager);

    // Inject locale middleware into every request
    // This middleware handles cloning the i18n instance per request
    core.adapter.use('*', localeMiddleware(i18nManager) as GravitoMiddleware)

    core.logger.info(`[OrbitCosmos] I18n initialized with locale: ${this.config.defaultLocale}`)
  }
}

/** @deprecated Use OrbitCosmos instead */
export const I18nOrbit = OrbitCosmos

export * from './I18nService'
export * from './loader'

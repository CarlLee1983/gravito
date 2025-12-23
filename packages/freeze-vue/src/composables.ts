/**
 * @gravito/freeze-vue - Plugin and Composables
 *
 * Vue 3 plugin and composables for SSG functionality.
 */

import { createDetector, type FreezeConfig, type FreezeDetector } from '@gravito/freeze'
import { type App, type ComputedRef, computed, type InjectionKey, inject, provide } from 'vue'

/**
 * Freeze context value
 */
export interface FreezeContext {
  config: FreezeConfig
  detector: FreezeDetector
  currentLocale: ComputedRef<string>
}

/**
 * Injection key for Freeze context
 */
export const FREEZE_KEY: InjectionKey<FreezeContext> = Symbol('freeze')

/**
 * Vue Plugin for SSG functionality.
 *
 * Configures the Freeze detector and provides it globally to your Vue application.
 *
 * @example
 * ```typescript
 * // main.ts
 * import { createApp } from 'vue'
 * import { FreezePlugin, defineConfig } from '@gravito/freeze-vue'
 *
 * const config = defineConfig({
 *   staticDomains: ['example.com'],
 *   locales: ['en', 'zh'],
 *   defaultLocale: 'en',
 *   baseUrl: 'https://example.com',
 * })
 *
 * const app = createApp(App)
 * app.use(FreezePlugin, config)
 * app.mount('#app')
 * ```
 */
export const FreezePlugin = {
  /**
   * Plugin installation function.
   *
   * @param app - The Vue application instance.
   * @param config - The Freeze configuration.
   */
  install(app: App, config: FreezeConfig) {
    const detector = createDetector(config)

    const currentLocale = computed(() => {
      if (typeof window === 'undefined') {
        return config.defaultLocale
      }
      return detector.getLocaleFromPath(window.location.pathname)
    })

    const context: FreezeContext = {
      config,
      detector,
      currentLocale,
    }

    app.provide(FREEZE_KEY, context)
  },
}

/**
 * Composable return type.
 */
export interface UseFreezeReturn {
  /** Whether currently in static site mode */
  isStatic: ComputedRef<boolean>
  /** Current locale code */
  locale: ComputedRef<string>
  /**
   * Get localized path for a given path and locale.
   *
   * @param path - The base path.
   * @param locale - The target locale (defaults to current locale).
   * @returns The localized path.
   */
  getLocalizedPath: (path: string, locale?: string) => string
  /**
   * Switch locale while preserving the current URL path.
   *
   * @param newLocale - The locale to switch to.
   * @returns The new localized path.
   */
  switchLocale: (newLocale: string) => string
  /**
   * Extract locale from a URL path.
   *
   * @param path - The URL pathname.
   * @returns The locale code.
   */
  getLocaleFromPath: (path: string) => string
  /**
   * Navigate to a different locale.
   *
   * @param newLocale - The locale to switch to.
   */
  navigateToLocale: (newLocale: string) => void
}

/**
 * Composable for accessing SSG utilities.
 *
 * Provides reactive access to environment status and locale-aware navigation functions.
 *
 * @returns An object containing SSG utilities.
 * @throws {Error} If used outside of a Vue app with `FreezePlugin` installed.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useFreeze } from '@gravito/freeze-vue'
 *
 * const { isStatic, locale, getLocalizedPath } = useFreeze()
 * </script>
 *
 * <template>
 *   <a :href="getLocalizedPath('/about')">About</a>
 * </template>
 * ```
 */
export function useFreeze(): UseFreezeReturn {
  const context = inject(FREEZE_KEY)

  if (!context) {
    throw new Error('useFreeze must be used within a Vue app with FreezePlugin installed')
  }

  const { detector, currentLocale } = context

  const isStatic = computed(() => detector.isStaticSite())

  const getLocalizedPath = (path: string, locale?: string): string => {
    return detector.getLocalizedPath(path, locale ?? currentLocale.value)
  }

  const switchLocale = (newLocale: string): string => {
    if (typeof window === 'undefined') {
      return `/${newLocale}`
    }
    return detector.switchLocale(window.location.pathname, newLocale)
  }

  const getLocaleFromPath = (path: string): string => {
    return detector.getLocaleFromPath(path)
  }

  const navigateToLocale = (newLocale: string): void => {
    if (typeof window !== 'undefined') {
      const newPath = switchLocale(newLocale)
      window.location.href = newPath
    }
  }

  return {
    isStatic,
    locale: currentLocale,
    getLocalizedPath,
    switchLocale,
    getLocaleFromPath,
    navigateToLocale,
  }
}

/**
 * Provide freeze context manually.
 *
 * Useful for SSR, testing, or custom setup scenarios where the plugin isn't used.
 *
 * @param config - The Freeze configuration.
 * @returns The created `FreezeContext`.
 */
export function provideFreeze(config: FreezeConfig): FreezeContext {
  const detector = createDetector(config)

  const currentLocale = computed(() => {
    if (typeof window === 'undefined') {
      return config.defaultLocale
    }
    return detector.getLocaleFromPath(window.location.pathname)
  })

  const context: FreezeContext = {
    config,
    detector,
    currentLocale,
  }

  provide(FREEZE_KEY, context)

  return context
}

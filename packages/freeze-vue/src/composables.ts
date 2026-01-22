/**
 * @gravito/freeze-vue - Plugin and Composables
 *
 * Vue 3 plugin and composables for SSG functionality.
 */

import {
  type AbsolutePath,
  createDetector,
  type FreezeConfig,
  type FreezeDetector,
  type Locale,
} from '@gravito/freeze'
import {
  type App,
  type Component,
  type ComputedRef,
  computed,
  type InjectionKey,
  inject,
  provide,
} from 'vue'

/**
 * Freeze context value
 */
export interface FreezeContext {
  config: FreezeConfig
  detector: FreezeDetector
  currentLocale: ComputedRef<Locale>
  /** Optional Inertia Link component */
  LinkComponent?: Component
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
 * import { Link } from '@inertiajs/vue3'
 *
 * const config = defineConfig({
 *   staticDomains: ['example.com'],
 *   locales: ['en', 'zh'],
 *   defaultLocale: 'en',
 *   baseUrl: 'https://example.com',
 * })
 *
 * const app = createApp(App)
 * app.use(FreezePlugin, { config, LinkComponent: Link })
 * app.mount('#app')
 * ```
 */
export const FreezePlugin = {
  /**
   * Plugin installation function.
   *
   * @param app - The Vue application instance.
   * @param options - Plugin options.
   * @param options.config - The Freeze configuration.
   * @param options.LinkComponent - Optional Inertia Link component.
   */
  install(app: App, options: { config: FreezeConfig; LinkComponent?: Component }) {
    const { config, LinkComponent } = options
    const detector = createDetector(config)

    const currentLocale = computed(() => {
      if (typeof window === 'undefined') {
        return config.defaultLocale
      }
      return detector.getCurrentLocale()
    })

    const context: FreezeContext = {
      config,
      detector,
      currentLocale,
      LinkComponent,
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
  locale: ComputedRef<Locale>
  /**
   * Get localized path for a given path and locale.
   *
   * @param path - The base path.
   * @param locale - The target locale (defaults to current locale).
   * @returns The localized path.
   */
  getLocalizedPath: (path: string | AbsolutePath, locale?: string | Locale) => AbsolutePath
  /**
   * Switch locale while preserving the current URL path.
   *
   * @param newLocale - The locale to switch to.
   * @returns The new localized path.
   */
  switchLocale: (newLocale: string | Locale) => AbsolutePath
  /**
   * Extract locale from a URL path.
   *
   * @param path - The URL pathname.
   * @returns The locale code.
   */
  getLocaleFromPath: (path: string | AbsolutePath) => Locale
  /**
   * Navigate to a different locale.
   *
   * @param newLocale - The locale to switch to.
   */
  navigateToLocale: (newLocale: string | Locale) => void
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

  const getLocalizedPath = (
    path: string | AbsolutePath,
    locale?: string | Locale
  ): AbsolutePath => {
    return detector.getLocalizedPath(path, locale ?? currentLocale.value)
  }

  const switchLocale = (newLocale: string | Locale): AbsolutePath => {
    if (typeof window === 'undefined') {
      return `/${newLocale}` as AbsolutePath
    }
    return detector.switchLocale(window.location.pathname, newLocale)
  }

  const getLocaleFromPath = (path: string | AbsolutePath): Locale => {
    return detector.getLocaleFromPath(path)
  }

  const navigateToLocale = (newLocale: string | Locale): void => {
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
 * @param options - Provision options.
 * @param options.config - The Freeze configuration.
 * @param options.LinkComponent - Optional Inertia Link component.
 * @returns The created `FreezeContext`.
 */
export function provideFreeze(options: {
  config: FreezeConfig
  LinkComponent?: Component
}): FreezeContext {
  const { config, LinkComponent } = options
  const detector = createDetector(config)

  const currentLocale = computed(() => {
    if (typeof window === 'undefined') {
      return config.defaultLocale
    }
    return detector.getCurrentLocale()
  })

  const context: FreezeContext = {
    config,
    detector,
    currentLocale,
    LinkComponent,
  }

  provide(FREEZE_KEY, context)

  return context
}

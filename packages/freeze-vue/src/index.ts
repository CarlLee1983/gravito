/**
 * @gravito/freeze-vue
 *
 * Vue 3 adapter for @gravito/freeze SSG module.
 *
 * This package provides Vue 3 components, composables, and plugins
 * for building static sites with Gravito Framework.
 *
 * @example
 * ```typescript
 * // main.ts
 * import { createApp } from 'vue'
 * import { FreezePlugin, defineConfig } from '@gravito/freeze-vue'
 * import App from './App.vue'
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
 *
 * ```vue
 * <!-- Navigation.vue -->
 * <script setup>
 * import { StaticLink, LocaleSwitcher, useFreeze } from '@gravito/freeze-vue'
 *
 * const { isStatic, locale } = useFreeze()
 * </script>
 *
 * <template>
 *   <nav>
 *     <StaticLink href="/about">About</StaticLink>
 *     <LocaleSwitcher locale="en">EN</LocaleSwitcher>
 *     <LocaleSwitcher locale="zh">中文</LocaleSwitcher>
 *   </nav>
 * </template>
 * ```
 *
 * @packageDocumentation
 */

export * from '@gravito/freeze'
// Components
export { LocaleSwitcher, StaticLink } from './components'
export type { FreezeContext, UseFreezeReturn } from './composables'
// Plugin and Composables
export { FREEZE_KEY, FreezePlugin, provideFreeze, useFreeze } from './composables'

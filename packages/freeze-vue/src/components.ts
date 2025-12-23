/**
 * @gravito/freeze-vue - Component Factories
 *
 * Helper functions to create Vue components for SSG.
 * NOTE: Since we can't use .vue SFC in this library build,
 * we provide renderless components using h() function.
 */

import { defineComponent, h, type PropType } from 'vue'
import { useFreeze } from './composables'

/**
 * StaticLink Component.
 *
 * Smart link component that uses native `<a>` for static sites
 * and Inertia Link for dynamic SSR mode.
 *
 * It automatically handles path localization based on the current locale.
 *
 * @param props - Component properties.
 * @param props.href - Target URL path.
 * @param props.skipLocalization - Whether to skip automatic localization (default: false).
 * @returns A Vue VNode.
 *
 * @example
 * ```vue
 * <script setup>
 * import { StaticLink } from '@gravito/freeze-vue'
 * </script>
 *
 * <template>
 *   <StaticLink href="/about">About</StaticLink>
 * </template>
 * ```
 */
export const StaticLink = defineComponent({
  name: 'StaticLink',
  props: {
    href: {
      type: String,
      required: true,
    },
    skipLocalization: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots, attrs }) {
    const { isStatic, getLocalizedPath } = useFreeze()

    // Try to get Inertia Link
    let InertiaLink: ReturnType<typeof defineComponent> | null = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const inertia = require('@inertiajs/vue3')
      InertiaLink = inertia.Link
    } catch {
      // Inertia not available
    }

    return () => {
      const finalHref = props.skipLocalization ? props.href : getLocalizedPath(props.href)

      // In static mode or if Inertia is not available, use native <a>
      if (isStatic.value || !InertiaLink) {
        return h('a', { href: finalHref, ...attrs }, slots.default?.())
      }

      // In SSR mode with Inertia, use Link component
      return h(InertiaLink, { href: finalHref, ...attrs }, slots.default)
    }
  },
})

/**
 * LocaleSwitcher Component.
 *
 * Renders an `<a>` tag that switches the site's locale while preserving
 * the current path.
 *
 * @param props - Component properties.
 * @param props.locale - The locale code to switch to (e.g., 'en', 'zh').
 * @returns A Vue VNode.
 *
 * @example
 * ```vue
 * <script setup>
 * import { LocaleSwitcher } from '@gravito/freeze-vue'
 * </script>
 *
 * <template>
 *   <LocaleSwitcher locale="en">English</LocaleSwitcher>
 *   <LocaleSwitcher locale="zh">中文</LocaleSwitcher>
 * </template>
 * ```
 */
export const LocaleSwitcher = defineComponent({
  name: 'LocaleSwitcher',
  props: {
    locale: {
      type: String as PropType<string>,
      required: true,
    },
  },
  setup(props, { slots, attrs }) {
    const { switchLocale, locale: currentLocale } = useFreeze()

    return () => {
      const targetPath = switchLocale(props.locale)
      const isActive = currentLocale.value === props.locale

      return h(
        'a',
        {
          href: targetPath,
          'aria-current': isActive ? 'page' : undefined,
          ...attrs,
        },
        slots.default?.() ?? props.locale.toUpperCase()
      )
    }
  },
})

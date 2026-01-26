/**
 * @gravito/freeze-vue - Component Factories
 *
 * Helper functions to create Vue components for SSG.
 * NOTE: Since we can't use .vue SFC in this library build,
 * we provide renderless components using h() function.
 */

import type { AbsolutePath, Locale } from '@gravito/freeze'
import { defineComponent, h, inject, type PropType } from 'vue'
import { FREEZE_KEY, useFreeze } from './composables'

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
      type: String as PropType<string | AbsolutePath>,
      required: true,
    },
    skipLocalization: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots, attrs }) {
    const { isStatic, getLocalizedPath } = useFreeze()
    const context = inject(FREEZE_KEY)

    return () => {
      const finalHref = props.skipLocalization ? props.href : getLocalizedPath(props.href)
      const InertiaLink = context?.LinkComponent

      // In static mode or if no Inertia Link is provided, use native <a>
      if (isStatic.value || !InertiaLink) {
        return h('a', { href: finalHref, ...attrs }, slots.default?.())
      }

      // In SSR mode with Inertia, use Link component
      return h(InertiaLink as any, { href: finalHref, ...attrs }, slots.default)
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
      type: String as PropType<string | Locale>,
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
        slots.default?.() ?? (props.locale as string).toUpperCase()
      )
    }
  },
})

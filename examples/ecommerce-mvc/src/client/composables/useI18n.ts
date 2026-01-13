import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

export function useI18n() {
  const page = usePage()

  const locale = computed(() => page.props.locale as string)
  const translations = computed(() => (page.props.translations as Record<string, any>) || {})

  /**
   * Translate a key
   * Usage: t('nav.home')
   */
  const t = (key: string, replacements?: Record<string, string | number>) => {
    const keys = key.split('.')
    let value: any = translations.value

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        value = undefined
        break
      }
    }

    if (value === undefined || typeof value !== 'string') {
      return key
    }

    if (replacements) {
      for (const [search, replace] of Object.entries(replacements)) {
        value = value.replace(new RegExp(`:${search}`, 'g'), String(replace))
      }
    }

    return value
  }

  return {
    locale,
    t,
    __: t, // Alias for Laravel style
  }
}

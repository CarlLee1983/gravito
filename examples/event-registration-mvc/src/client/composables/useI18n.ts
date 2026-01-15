import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

export function useI18n() {
  const page = usePage()

  // Use computed to ensure reactivity when page.props changes
  const translations = computed(() => (page.props.translations as any) || {})
  const currentLocale = computed(() => (page.props.locale as string) || 'en')

  /**
   * Translate a key using the shared translations from the backend
   * @param key - The translation key (e.g., 'common.welcome')
   * @param replacements - Optional replacements for parameters
   */
  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: any = translations.value

    if (Object.keys(value).length === 0) {
      // If we're missing '.' it might be a raw string, but if we have '.', it's likely a missing translation bundle
      if (key.includes('.')) {
        console.warn(`[useI18n] Translations not yet loaded or empty for key: ${key}`)
      }
    }

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        value = undefined
        break
      }
    }

    if (value === undefined || typeof value !== 'string') {
      // In development, this helps identify missing keys
      return key
    }

    if (replacements) {
      for (const [search, replace] of Object.entries(replacements)) {
        value = value.replace(new RegExp(`:${search}`, 'g'), String(replace))
      }
    }

    return value
  }

  const getLocale = () => currentLocale.value

  return { t, getLocale }
}

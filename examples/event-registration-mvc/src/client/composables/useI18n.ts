import { usePage } from '@inertiajs/vue3'

export function useI18n() {
  const page = usePage()

  /**
   * Translate a key using the shared translations from the backend
   * @param key - The translation key (e.g., 'common.welcome')
   * @param replacements - Optional replacements for parameters
   */
  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const translations = (page.props.translations as any) || {}
    const keys = key.split('.')

    let value: any = translations
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

  const getLocale = () => (page.props.locale as string) || 'en'

  return { t, getLocale }
}

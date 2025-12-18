import { usePage } from '@inertiajs/react'

interface TranslationObject {
  [key: string]: string | TranslationObject
}

export function useTrans() {
  const { t } = usePage().props as { t?: TranslationObject }

  /**
   * Translate a key.
   * Usage: trans('hero.title', 'Default Title')
   */
  const trans = (key: string, defaultValue?: string) => {
    // If t is missing totally
    if (!t) {
      return defaultValue || key
    }

    const parts = key.split('.')
    let current: TranslationObject | string | undefined = t

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue || key
      }
      current = current[part]
    }

    if (current === undefined || current === null) {
      return defaultValue || key
    }

    return String(current)
  }

  return { trans, t }
}

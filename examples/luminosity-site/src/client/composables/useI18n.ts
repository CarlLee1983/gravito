import { useFreeze } from '@gravito/freeze-vue'
import { computed } from 'vue'
import en from '../locales/en'
import zh from '../locales/zh'

const locales: Record<string, typeof en> = { en, zh }

export function useI18n() {
  const { locale } = useFreeze()

  const t = computed(() => {
    const currentLocale = locale.value || 'en'
    return locales[currentLocale] || locales.en
  })

  return {
    locale,
    t,
  }
}

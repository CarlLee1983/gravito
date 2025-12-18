import en from '../locales/en'
import zh from '../locales/zh'

export type Locale = 'en' | 'zh'
export type Translation = typeof en

const locales: Record<Locale, Translation> = { en, zh }

export const getTranslation = (locale: string): Translation => {
  return locales[locale as Locale] || locales.en
}

export const getAvailableLocales = () => Object.keys(locales)

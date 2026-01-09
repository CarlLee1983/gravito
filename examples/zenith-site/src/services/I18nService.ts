import en from '../locales/en'
import zhTW from '../locales/zh-TW'

export type Locale = 'en' | 'zh-TW'
export type Translation = typeof en

const locales: Record<Locale, Translation> = { en, 'zh-TW': zhTW }

export const getTranslation = (locale: string): Translation => {
  return locales[locale as Locale] || locales.en
}

export const getAvailableLocales = (): Locale[] => Object.keys(locales) as Locale[]

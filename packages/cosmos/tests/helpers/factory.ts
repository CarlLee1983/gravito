import { type I18nConfig, I18nManager, type TranslationMap } from '../../src/I18nService'

export function createTestManager(overrides?: Partial<I18nConfig>): I18nManager {
  return new I18nManager({
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh-TW'],
    translations: {
      en: {
        common: {
          welcome: 'Welcome',
          goodbye: 'Goodbye',
        },
      },
      'zh-TW': {
        common: {
          welcome: '歡迎',
          goodbye: '再見',
        },
      },
    },
    ...overrides,
  })
}

export function generateLargeTranslations(
  locales = 5,
  keys = 1000
): Record<string, TranslationMap> {
  const result: Record<string, TranslationMap> = {}

  for (let l = 0; l < locales; l++) {
    const locale = `locale${l}`
    result[locale] = {}

    for (let k = 0; k < keys; k++) {
      result[locale][`key${k}`] = `Translation ${k} for ${locale}`
    }
  }

  return result
}

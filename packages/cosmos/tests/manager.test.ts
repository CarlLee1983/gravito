import { describe, expect, test } from 'bun:test'
import { I18nManager } from '../src/index'

describe('Orbit I18n Manager', () => {
  const _config = {
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh', 'jp'],
    translations: {
      en: {
        welcome: 'Welcome',
        'auth.failed': 'Start Login Failed', // Nested key test mock
        nested: 'Start Nested',
      },
      zh: {
        welcome: '歡迎',
      },
    },
  }

  // Manually constructing nested object for test since our mock config above is flat strings
  // But our I18nManager logic supports object traversal. Let's fix the mock data to be object structure if we want to test traversal properly,
  // OR we fix our Loader to flatten everything?
  // Gravito's Manager currently supports object traversal: value[k].
  // Let's use proper object structure for 'auth' in 'en'.
  // Redefining config for clarity.
  const nestedConfig = {
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh'],
    translations: {
      en: {
        title: 'Hello',
        auth: {
          // @ts-expect-error
          failed: 'Failed Login',
        } as any,
      },
      zh: {
        title: '你好',
      },
    },
  }

  test('it selects default locale initially', () => {
    const i18n = new I18nManager(nestedConfig as any)
    expect(i18n.locale).toBe('en')
  })

  test('it can change locale', () => {
    const i18n = new I18nManager(nestedConfig as any)
    i18n.locale = 'zh'
    expect(i18n.locale).toBe('zh')

    // Unsupported locale should be ignored (based on our implementation logic?)
    // Let's check implementation: if (supported.includes) ...
    i18n.locale = 'fr'
    expect(i18n.locale).toBe('zh')
  })

  test('it translates simple keys', () => {
    const i18n = new I18nManager(nestedConfig as any)
    expect(i18n.t('title')).toBe('Hello')

    i18n.locale = 'zh'
    expect(i18n.t('title')).toBe('你好')
  })

  test('it handles fallback to default locale', () => {
    const i18n = new I18nManager(nestedConfig as any)
    i18n.locale = 'zh'

    // 'auth.failed' is only in EN
    expect(i18n.t('auth.failed')).toBe('Failed Login')
  })

  test('it returns key if not found', () => {
    const i18n = new I18nManager(nestedConfig as any)
    expect(i18n.t('missing.key')).toBe('missing.key')
  })

  test('it supports replacements', () => {
    const i18n = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en'],
      translations: {
        en: {
          greet: 'Hello :name',
        },
      },
    })

    expect(i18n.t('greet', { name: 'Carl' })).toBe('Hello Carl')
  })
})

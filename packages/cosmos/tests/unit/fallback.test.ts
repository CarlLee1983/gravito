import { describe, expect, it } from 'bun:test'
import { I18nManager } from '../../src/I18nService'

describe('Fallback Strategies', () => {
  it('uses default fallback chain (defaultLocale)', () => {
    const manager = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en', 'fr'],
      translations: {
        en: { hello: 'Hello' },
        fr: {},
      },
    })
    expect(manager.translate('fr', 'hello')).toBe('Hello')
  })

  it('uses configured fallback chain', () => {
    const manager = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en', 'es', 'pt'],
      translations: {
        en: { hello: 'Hello' },
        es: { hello: 'Hola' },
        pt: {},
      },
      fallback: {
        fallbackChain: {
          pt: ['es', 'en'],
        },
      },
    })
    expect(manager.translate('pt', 'hello')).toBe('Hola')
  })

  it('handles missing key strategies', () => {
    const manager = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en'],
      translations: { en: {} },
      fallback: {
        onMissingKey: 'empty',
      },
    })
    expect(manager.translate('en', 'missing')).toBe('')

    const managerThrow = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en'],
      translations: { en: {} },
      fallback: {
        onMissingKey: 'throw',
      },
    })
    expect(() => managerThrow.translate('en', 'missing')).toThrow()

    const managerCustom = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en'],
      translations: { en: {} },
      fallback: {
        onMissingKey: (key, locale) => `Missing ${key} in ${locale}`,
      },
    })
    expect(managerCustom.translate('en', 'missing')).toBe('Missing missing in en')
  })
})

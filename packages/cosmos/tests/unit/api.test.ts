import { describe, expect, it } from 'bun:test'
import { I18nManager } from '../../src/I18nService'

describe('I18nManager API', () => {
  it('supports multiple translations', () => {
    const manager = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en'],
      translations: {
        en: {
          hello: 'Hello',
          goodbye: 'Goodbye',
        },
      },
    })

    const translations = manager.tMany(['hello', 'goodbye', 'missing'])

    expect(translations.hello).toBe('Hello')
    expect(translations.goodbye).toBe('Goodbye')
    expect(translations.missing).toBe('missing')
  })

  it('reports loaded locales', async () => {
    const manager = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en', 'fr'],
      translations: {
        en: { hello: 'Hello' },
      },
    })

    expect(manager.getLocales()).toContain('en')
    expect(manager.isLocaleLoaded('en')).toBe(true)
    expect(manager.isLocaleLoaded('fr')).toBe(false)
  })
})

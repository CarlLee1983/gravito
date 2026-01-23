import { describe, expect, it } from 'bun:test'
import { I18nManager } from '../../src/I18nService'

describe('I18nManager - Edge Cases', () => {
  describe('Empty Translations', () => {
    it('should handle empty translation object', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: {},
      })
      expect(manager.translate('en', 'any.key')).toBe('any.key')
    })

    it('should handle empty string translation', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { empty: '' } },
      })
      expect(manager.translate('en', 'empty')).toBe('')
    })
  })

  describe('Special Characters', () => {
    it('should handle keys with special characters', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { 'key.with.dots': 'value' } },
      })
      expect(manager.translate('en', 'key.with.dots')).toBe('key.with.dots')
    })

    it('should handle unicode keys', () => {
      const manager = new I18nManager({
        defaultLocale: 'zh-TW',
        supportedLocales: ['zh-TW'],
        translations: { 'zh-TW': { 歡迎: '歡迎訊息' } },
      })
      expect(manager.translate('zh-TW', '歡迎')).toBe('歡迎訊息')
    })

    it('should handle HTML in translations', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { html: '<strong>Bold</strong>' } },
      })
      expect(manager.translate('en', 'html')).toBe('<strong>Bold</strong>')
    })
  })

  describe('Deep Nesting', () => {
    it('should handle deeply nested keys (10 levels)', () => {
      const translations = {
        en: {
          l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: { l9: { l10: 'deep' } } } } } } } } },
        },
      }
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations,
      })
      expect(manager.translate('en', 'l1.l2.l3.l4.l5.l6.l7.l8.l9.l10')).toBe('deep')
    })
  })

  describe('Parameter Replacement', () => {
    it('should handle missing parameters', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { greeting: 'Hello :name!' } },
      })
      expect(manager.translate('en', 'greeting', {})).toBe('Hello :name!')
    })

    it('should handle extra parameters', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { greeting: 'Hello :name!' } },
      })
      expect(manager.translate('en', 'greeting', { name: 'Carl', extra: 'ignored' })).toBe(
        'Hello Carl!'
      )
    })

    it('should handle parameter with special regex characters', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { msg: 'Value: :value' } },
      })
      expect(manager.translate('en', 'msg', { value: '$100.00' })).toBe('Value: $100.00')
    })
  })
})

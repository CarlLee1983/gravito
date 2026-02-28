import { describe, expect, it } from 'bun:test'
import { I18nText } from '../../../src/Domain/ValueObjects/I18nText'

describe('I18nText ValueObject', () => {
  it('should create i18n text with single translation', () => {
    const text = I18nText.of({ en: 'Hello' })
    expect(text.getText('en')).toBe('Hello')
  })

  it('should create i18n text with multiple translations', () => {
    const text = I18nText.of({
      en: 'Product Name',
      'zh-TW': '商品名稱',
      ja: '商品名',
    })
    expect(text.getText('en')).toBe('Product Name')
    expect(text.getText('zh-TW')).toBe('商品名稱')
    expect(text.getText('ja')).toBe('商品名')
  })

  it('should throw error for empty translations', () => {
    expect(() => I18nText.of({})).toThrow()
  })

  it('should return empty string for missing locale without fallback', () => {
    const text = I18nText.of({ en: 'English' })
    expect(text.getText('fr')).toBe('')
  })

  it('should return fallback for missing locale', () => {
    const text = I18nText.of({ en: 'English' })
    expect(text.getText('fr', 'Français')).toBe('Français')
  })

  it('should check if locale exists', () => {
    const text = I18nText.of({
      en: 'English',
      'zh-TW': '繁體中文',
    })
    expect(text.hasLocale('en')).toBe(true)
    expect(text.hasLocale('zh-TW')).toBe(true)
    expect(text.hasLocale('fr')).toBe(false)
  })

  it('should get all available locales', () => {
    const text = I18nText.of({
      en: 'English',
      'zh-TW': '繁體中文',
      ja: '日本語',
    })
    const locales = text.getAvailableLocales()
    expect(locales).toContain('en')
    expect(locales).toContain('zh-TW')
    expect(locales).toContain('ja')
    expect(locales.length).toBe(3)
  })

  it('should return readonly copy of translations', () => {
    const original = { en: 'English' }
    const text = I18nText.of(original)
    const translations = text.translations
    translations.en = 'Modified'
    expect(text.getText('en')).toBe('English')
  })

  it('should have value equality for same translations', () => {
    const text1 = I18nText.of({ en: 'Same', 'zh-TW': '相同' })
    const text2 = I18nText.of({ en: 'Same', 'zh-TW': '相同' })
    expect(text1.equals(text2)).toBe(true)
  })

  it('should have different equality for different translations', () => {
    const text1 = I18nText.of({ en: 'Different' })
    const text2 = I18nText.of({ en: 'Other' })
    expect(text1.equals(text2)).toBe(false)
  })

  it('should preserve order of translations', () => {
    const text = I18nText.of({
      'zh-TW': '繁體中文',
      en: 'English',
      ja: '日本語',
    })
    const locales = text.getAvailableLocales()
    expect(locales[0]).toBe('zh-TW')
    expect(locales[1]).toBe('en')
    expect(locales[2]).toBe('ja')
  })
})

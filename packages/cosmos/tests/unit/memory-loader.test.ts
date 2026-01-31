/**
 * @file packages/cosmos/tests/unit/memory-loader.test.ts
 * @description MemoryLoader 單元測試
 */

import { describe, expect, it } from 'bun:test'
import { MemoryLoader } from '../../src/loaders/MemoryLoader'

describe('MemoryLoader', () => {
  it('should load translations from memory', async () => {
    const loader = new MemoryLoader({
      translations: {
        en: { hello: 'Hello', welcome: 'Welcome' },
        'zh-TW': { hello: '你好', welcome: '歡迎' },
      },
    })

    const en = await loader.load('en')
    expect(en).toEqual({ hello: 'Hello', welcome: 'Welcome' })

    const zhTW = await loader.load('zh-TW')
    expect(zhTW).toEqual({ hello: '你好', welcome: '歡迎' })
  })

  it('should return null for missing locale', async () => {
    const loader = new MemoryLoader({
      translations: { en: { hello: 'Hello' } },
    })

    const result = await loader.load('fr')
    expect(result).toBeNull()
  })

  it('should support fallback chain', async () => {
    const primary = new MemoryLoader({
      translations: { en: { hello: 'Hello' } },
    })

    const fallback = new MemoryLoader({
      translations: { fr: { hello: 'Bonjour' } },
    })

    primary.fallback(fallback)

    const result = await primary.load('fr')
    expect(result).toEqual({ hello: 'Bonjour' })
  })

  it('should allow adding translations dynamically', async () => {
    const loader = new MemoryLoader({
      translations: { en: { hello: 'Hello' } },
    })

    loader.addTranslations('fr', { hello: 'Bonjour' })

    const result = await loader.load('fr')
    expect(result).toEqual({ hello: 'Bonjour' })
  })

  it('should merge when adding translations to existing locale', async () => {
    const loader = new MemoryLoader({
      translations: { en: { hello: 'Hello' } },
    })

    loader.addTranslations('en', { goodbye: 'Goodbye' })

    const result = await loader.load('en')
    expect(result).toEqual({ hello: 'Hello', goodbye: 'Goodbye' })
  })

  it('should allow removing translations', async () => {
    const loader = new MemoryLoader({
      translations: {
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' },
      },
    })

    loader.removeTranslations('fr')

    const result = await loader.load('fr')
    expect(result).toBeNull()
  })

  it('should return loaded locales', () => {
    const loader = new MemoryLoader({
      translations: {
        en: { hello: 'Hello' },
        'zh-TW': { hello: '你好' },
        fr: { hello: 'Bonjour' },
      },
    })

    const locales = loader.getLoadedLocales()
    expect(locales).toContain('en')
    expect(locales).toContain('zh-TW')
    expect(locales).toContain('fr')
    expect(locales.length).toBe(3)
  })

  it('should check if locale exists', () => {
    const loader = new MemoryLoader({
      translations: { en: { hello: 'Hello' } },
    })

    expect(loader.hasLocale('en')).toBe(true)
    expect(loader.hasLocale('fr')).toBe(false)
  })

  it('should handle nested translations', async () => {
    const loader = new MemoryLoader({
      translations: {
        en: {
          auth: {
            login: 'Login',
            logout: 'Logout',
          },
        },
      },
    })

    const result = await loader.load('en')
    expect(result).toEqual({
      auth: {
        login: 'Login',
        logout: 'Logout',
      },
    })
  })
})

import { describe, expect, it, jest } from 'bun:test'
import { I18nInstance, I18nManager, localeMiddleware } from '../src/I18nService'
import { I18nOrbit, OrbitCosmos } from '../src/index'

describe('I18nManager and I18nInstance', () => {
  const baseConfig = {
    defaultLocale: 'en',
    supportedLocales: ['en', 'fr'],
    translations: {
      en: {
        greet: 'Hi :name',
        nested: {
          title: 'Title',
        },
      },
    },
  }

  it('adds resources and translates with replacements', () => {
    const manager = new I18nManager(baseConfig as any)
    manager.addResource('fr', { greet: 'Salut :name' })
    manager.locale = 'fr'
    expect(manager.t('greet', { name: 'Carl' })).toBe('Salut Carl')
  })

  it('clones instances with explicit locale', () => {
    const manager = new I18nManager(baseConfig as any)
    const instance = manager.clone('fr') as I18nInstance
    expect(instance.getLocale()).toBe('fr')
    expect(instance.has('missing.key')).toBe(false)
  })

  it('returns key when value is not a string', () => {
    const manager = new I18nManager(baseConfig as any)
    expect(manager.t('nested')).toBe('nested')
  })
})

describe('localeMiddleware', () => {
  it('prefers route param locale and injects i18n', async () => {
    const manager = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en', 'zh'],
      translations: {
        en: { title: 'Hello' },
        zh: { title: '你好' },
      },
    })
    const middleware = localeMiddleware(manager)
    const ctx = {
      req: {
        param: jest.fn(() => 'zh'),
        query: jest.fn(() => undefined),
        header: jest.fn(() => undefined),
      },
      set: jest.fn(),
    }

    await middleware(ctx as any, async () => {})

    const injected = ctx.set.mock.calls[0][1]
    expect(ctx.set).toHaveBeenCalledWith('i18n', expect.any(I18nInstance))
    expect(injected.locale).toBe('zh')
  })

  it('uses default locale when none provided', async () => {
    const manager = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en'],
      translations: {
        en: { title: 'Hello' },
      },
    })
    const middleware = localeMiddleware(manager)
    const ctx = {
      req: {
        param: jest.fn(() => undefined),
        query: jest.fn(() => undefined),
        header: jest.fn(() => undefined),
      },
      set: jest.fn(),
    }

    await middleware(ctx as any, async () => {})

    const injected = ctx.set.mock.calls[0][1]
    expect(injected.locale).toBe('en')
  })
})

describe('OrbitCosmos', () => {
  it('installs locale middleware and logs initialization', () => {
    const core = {
      adapter: { use: jest.fn() },
      logger: { info: jest.fn() },
    }
    const orbit = new OrbitCosmos({
      defaultLocale: 'en',
      supportedLocales: ['en'],
      translations: { en: { title: 'Hello' } },
    })

    orbit.install(core as any)

    expect(core.adapter.use).toHaveBeenCalledWith('*', expect.any(Function))
    expect(core.logger.info).toHaveBeenCalledWith('[OrbitCosmos] I18n initialized with locale: en')
    expect(I18nOrbit).toBe(OrbitCosmos)
  })
})

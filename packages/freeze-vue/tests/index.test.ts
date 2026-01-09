import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

const injectionStore = new Map<unknown, unknown>()

mock.module('vue', () => ({
  defineComponent: (component: any) => component,
  h: (type: any, props: any, children?: any) => ({ type, props, children }),
  computed: (getter: () => unknown) => ({ value: getter() }),
  inject: (key: unknown) => injectionStore.get(key),
  provide: (key: unknown, value: unknown) => {
    injectionStore.set(key, value)
  },
}))

mock.module('@gravito/freeze', () => ({
  defineConfig: (config: Record<string, unknown>) => ({
    previewPort: 4173,
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    ...config,
  }),
  createDetector: () => ({
    isStaticSite: () => true,
    getLocalizedPath: (path: string, locale: string) => `/${locale}${path === '/' ? '' : path}`,
    switchLocale: (path: string, locale: string) => `/${locale}${path === '/' ? '/' : path}`,
    getLocaleFromPath: (path: string) => (path.startsWith('/zh') ? 'zh' : 'en'),
  }),
  generateRedirectHtml: (target: string) => `redirect:${target}`,
  generateRedirects: () => new Map(),
  generateLocalizedRoutes: () => [],
  inferRedirects: () => [],
  generateSitemapEntries: () => [],
}))

let defineConfig: typeof import('../src').defineConfig
let FreezePlugin: typeof import('../src').FreezePlugin
let provideFreeze: typeof import('../src').provideFreeze
let useFreeze: typeof import('../src').useFreeze
let FREEZE_KEY: typeof import('../src').FREEZE_KEY
let StaticLink: typeof import('../src').StaticLink
let LocaleSwitcher: typeof import('../src').LocaleSwitcher

beforeAll(async () => {
  const module = await import('../src')
  defineConfig = module.defineConfig
  FreezePlugin = module.FreezePlugin
  provideFreeze = module.provideFreeze
  useFreeze = module.useFreeze
  FREEZE_KEY = module.FREEZE_KEY
  StaticLink = module.StaticLink
  LocaleSwitcher = module.LocaleSwitcher
})

afterAll(() => {
  mock.restore()
})

describe('@gravito/freeze-vue', () => {
  it('installs plugin and provides context', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    const app = { provide: (key: unknown, value: unknown) => injectionStore.set(key, value) }
    FreezePlugin.install(app as any, config as any)

    const context = injectionStore.get(FREEZE_KEY) as any
    expect(context.config.baseUrl).toBe('https://example.com')
    expect(context.currentLocale.value).toBe('en')
  })

  it('useFreeze exposes localized helpers', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    provideFreeze(config as any)
    const freeze = useFreeze()

    expect(freeze.isStatic.value).toBe(true)
    expect(freeze.getLocalizedPath('/about')).toBe('/en/about')
    expect(freeze.switchLocale('zh')).toBe('/zh')
  })

  it('StaticLink renders localized href', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })
    provideFreeze(config as any)

    const render = StaticLink.setup?.(
      { href: '/about', skipLocalization: false },
      {
        slots: { default: () => ['About'] },
        attrs: {},
      }
    )
    const vnode = render?.()

    expect(vnode.props.href).toBe('/en/about')
    expect(vnode.children).toEqual(['About'])
  })

  it('LocaleSwitcher marks active locale', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })
    provideFreeze(config as any)

    const render = LocaleSwitcher.setup?.(
      { locale: 'en' },
      {
        slots: { default: () => ['English'] },
        attrs: {},
      }
    )
    const vnode = render?.()

    expect(vnode.props['aria-current']).toBe('page')
    expect(vnode.props.href).toBe('/en')
  })
})

import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

const detectorState = { isStatic: true, currentLocale: 'en' }

type ContextStore<T> = { value: T | null }

const createContextMock = <T>(defaultValue: T | null) => {
  const store: ContextStore<T> = { value: defaultValue }
  return {
    _store: store,
    Provider: ({ value, children }: { value: T; children: unknown }) => {
      store.value = value
      if (typeof children === 'function') {
        return children()
      }
      return children
    },
  }
}

const useContextMock = <T>(ctx: { _store: ContextStore<T> }) => ctx._store.value

const createElementMock = (type: any, props: any, ...children: any[]) => {
  const mergedProps = { ...props }
  if (children.length === 1) {
    mergedProps.children = children[0]
  } else if (children.length > 1) {
    mergedProps.children = children
  }
  if (typeof type === 'function') {
    return type(mergedProps)
  }
  return { type, props: mergedProps }
}

mock.module('react', () => ({
  createContext: createContextMock,
  useContext: useContextMock,
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (fn: (...args: any[]) => unknown) => fn,
  createElement: createElementMock,
}))

mock.module('react/jsx-runtime', () => ({
  jsx: createElementMock,
  jsxs: createElementMock,
  Fragment: 'fragment',
}))

mock.module('react/jsx-dev-runtime', () => ({
  jsxDEV: createElementMock,
  Fragment: 'fragment',
}))

mock.module('@gravito/freeze', () => ({
  defineConfig: (config: Record<string, unknown>) => ({
    previewPort: 4173,
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    ...config,
  }),
  createDetector: () => ({
    isStaticSite: () => detectorState.isStatic,
    getLocalizedPath: (path: string, locale: string) => `/${locale}${path === '/' ? '' : path}`,
    switchLocale: (path: string, locale: string) => `/${locale}${path === '/' ? '/' : path}`,
    getLocaleFromPath: (path: string) => (path.startsWith('/zh') ? 'zh' : 'en'),
    getCurrentLocale: () => detectorState.currentLocale,
  }),
  generateRedirectHtml: (target: string) => `redirect:${target}`,
  generateRedirects: () => new Map(),
  generateLocalizedRoutes: () => [],
  inferRedirects: () => [],
  generateSitemapEntries: () => [],
}))

let React: typeof import('react')
let FreezeProvider: typeof import('../src').FreezeProvider
let StaticLink: typeof import('../src').StaticLink
let LocaleSwitcher: typeof import('../src').LocaleSwitcher
let useFreeze: typeof import('../src').useFreeze
let defineConfig: typeof import('../src').defineConfig
let createDetector: typeof import('../src').createDetector

const _unwrapElement = (node: any): any => {
  if (!node || typeof node !== 'object') {
    return node
  }
  if (node.props?.children && typeof node.props.children === 'object') {
    return node.props.children
  }
  return node
}

beforeAll(async () => {
  React = await import('react')
  const module = await import('../src')
  FreezeProvider = module.FreezeProvider
  StaticLink = module.StaticLink
  LocaleSwitcher = module.LocaleSwitcher
  useFreeze = module.useFreeze
  defineConfig = module.defineConfig
  createDetector = module.createDetector
})

afterAll(() => {
  mock.restore()
})

describe('@gravito/freeze-react', () => {
  it('re-exports config helpers', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    expect(config.staticDomains).toEqual(['example.com'])
    expect(config.previewPort).toBe(4173)

    const detector = createDetector(config as any)
    expect(typeof detector.isStaticSite).toBe('function')
  })

  it('provides FreezeProvider context to hooks', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    React.createElement(FreezeProvider, { config }, () => null)
    const value = useFreeze()

    expect(value.isStatic).toBe(true)
    expect(value.locale).toBe('en')
    expect(value.switchLocale('zh')).toBe('/zh')
  })

  it('renders StaticLink with localized href', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    React.createElement(FreezeProvider, { config }, () => null)
    const link = StaticLink({ href: '/about', children: 'About' } as any)
    expect(link.props?.href).toBe('/en/about')
  })

  it('renders LocaleSwitcher with active state', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    detectorState.currentLocale = 'en'

    React.createElement(FreezeProvider, { config, locale: 'en' }, () => null)
    const link = LocaleSwitcher({ locale: 'en', children: 'English' } as any)
    expect(link.props?.['aria-current']).toBe('page')
  })
})

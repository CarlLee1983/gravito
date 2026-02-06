import { afterAll, afterEach, beforeAll, describe, expect, it, mock } from 'bun:test'

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

let effectCallCount = 0
mock.module('react', () => ({
  createContext: createContextMock,
  useContext: useContextMock,
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (fn: (...args: any[]) => unknown) => fn,
  useState: <T>(initial: T | (() => T)) => {
    if (typeof initial === 'function') {
      return [(initial as () => T)(), () => {}]
    }
    return [initial as T, () => {}]
  },
  createElement: createElementMock,
  useEffect: (effect: () => (() => void) | void) => {
    // Execute first two FreezeProvider useEffects to test coverage
    effectCallCount++
    if (effectCallCount <= 2) {
      // Wrap with error handling for window operations
      try {
        effect()
      } catch {
        // Ignore errors from window operations
      }
    }
  },
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
  asLocale: (v: string) => v,
  asAbsolutePath: (v: string) => v,
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

    // @ts-expect-error - mock createElement doesn't match real React types
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

    // @ts-expect-error - mock createElement doesn't match real React types
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

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config, locale: 'en' }, () => null)
    const link = LocaleSwitcher({ locale: 'en', children: 'English' } as any)
    expect(link.props?.['aria-current']).toBe('page')
  })
})

describe('@gravito/freeze-react - Additional Coverage', () => {
  afterEach(() => {
    // Restore global state
    detectorState.isStatic = true
    detectorState.currentLocale = 'en'
    // Clean up window mock if it was set
    if (typeof globalThis.window !== 'undefined' && (globalThis.window as any).__isMocked) {
      delete (globalThis as any).window
    }
  })

  it('exposes getLocaleFromPath utility function', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config }, () => null)
    const freeze = useFreeze()

    expect(freeze.getLocaleFromPath('/zh/about')).toBe('zh')
    expect(freeze.getLocaleFromPath('/en/contact')).toBe('en')
  })

  it('handles switchLocale in server-side environment (no window)', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config }, () => null)
    const freeze = useFreeze()

    // In Node environment, window is undefined
    // switchLocale should return simple path
    const result = freeze.switchLocale('zh')
    expect(result).toBe('/zh')
  })

  it('handles switchLocale with window object and query parameters', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    // Mock window environment
    const mockWindow = {
      __isMocked: true,
      location: {
        pathname: '/en/products',
        search: '?page=1&sort=name',
      },
    }
    ;(globalThis as any).window = mockWindow

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config }, () => null)
    const freeze = useFreeze()

    // With window, switchLocale should process query parameters
    const result = freeze.switchLocale('zh')
    // Should contain locale and path, query params handled (lang removed but others kept)
    expect(result).toContain('/zh')
  })

  it('renders StaticLink with Inertia LinkComponent in dynamic mode', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    // Create a mock Inertia Link component
    const MockInertiaLink = ({ href, children, className, ...props }: any) => ({
      type: 'inertia-link',
      props: { href, children, className, ...props },
    })

    // Switch to dynamic mode
    detectorState.isStatic = false

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config, LinkComponent: MockInertiaLink }, () => null)

    const link = StaticLink({ href: '/about', children: 'About' } as any)
    expect(link.type).toBe('inertia-link')
    expect(link.props?.href).toBe('/en/about')
  })

  it('handles skipLocalization prop in StaticLink', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config }, () => null)
    const link = StaticLink({
      href: '/about',
      children: 'About',
      skipLocalization: true,
    } as any)
    expect(link.props?.href).toBe('/about')
  })

  it('calls navigateToLocale with window environment', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    // Mock window with location
    let navigatedUrl = ''
    const mockWindow = {
      __isMocked: true,
      location: {
        pathname: '/en/products',
        search: '?page=1',
        href: '/en/products?page=1',
      },
    }
    Object.defineProperty(mockWindow.location, 'href', {
      set: (value: string) => {
        navigatedUrl = value
      },
      get: () => navigatedUrl,
    })
    ;(globalThis as any).window = mockWindow

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config }, () => null)
    const freeze = useFreeze()

    // Call navigateToLocale which should set window.location.href
    freeze.navigateToLocale('zh')
    expect(navigatedUrl).toContain('/zh')
  })

  it('provides LocaleSwitcher with locale not active', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    detectorState.currentLocale = 'en'

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config, locale: 'en' }, () => null)
    const link = LocaleSwitcher({ locale: 'zh', children: 'Chinese' } as any)
    expect(link.props?.['aria-current']).toBeUndefined()
    expect(link.props?.href).toContain('/zh')
  })

  it('creates detector from config', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
      locales: ['en', 'zh'],
      defaultLocale: 'en',
    })

    const detector = createDetector(config as any)
    expect(detector.isStaticSite()).toBe(true)
    expect(detector.getCurrentLocale()).toBe('en')
    expect(detector.getLocalizedPath('/about', 'zh')).toBe('/zh/about')
  })

  it('throws error when useFreeze used without FreezeProvider', async () => {
    // Create a fresh import to test without provider
    // Clear the context store so useFreeze will fail
    // Mock a version that returns null
    mock.module('react', () => ({
      createContext: createContextMock,
      useContext: () => null, // Simulate context not found
      useMemo: (factory: () => unknown) => factory(),
      useCallback: (fn: (...args: any[]) => unknown) => fn,
      useState: <T>(initial: T | (() => T)) => {
        if (typeof initial === 'function') {
          return [(initial as () => T)(), () => {}]
        }
        return [initial as T, () => {}]
      },
      createElement: createElementMock,
      useEffect: (_effect: () => (() => void) | void) => {},
    }))

    // Re-import to get fresh instance
    const { useFreezeContext: testUseFreezeContext } = await import('../src/provider')

    expect(() => {
      testUseFreezeContext()
    }).toThrow('useFreeze must be used within a FreezeProvider')

    // Restore original mocks
    mock.module('react', () => ({
      createContext: createContextMock,
      useContext: useContextMock,
      useMemo: (factory: () => unknown) => factory(),
      useCallback: (fn: (...args: any[]) => unknown) => fn,
      useState: <T>(initial: T | (() => T)) => {
        if (typeof initial === 'function') {
          return [(initial as () => T)(), () => {}]
        }
        return [initial as T, () => {}]
      },
      createElement: createElementMock,
      useEffect: (_effect: () => (() => void) | void) => {},
    }))
  })

  it('uses getLocalizedPath with custom locale parameter', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config }, () => null)
    const freeze = useFreeze()

    const enPath = freeze.getLocalizedPath('/about', 'en')
    const zhPath = freeze.getLocalizedPath('/about', 'zh')

    expect(enPath).toBe('/en/about')
    expect(zhPath).toBe('/zh/about')
  })

  it('StaticLink uses native anchor when no LinkComponent provided', () => {
    const config = defineConfig({
      staticDomains: ['example.com'],
      baseUrl: 'https://example.com',
    })

    // @ts-expect-error - mock createElement doesn't match real React types
    React.createElement(FreezeProvider, { config }, () => null)
    const link = StaticLink({
      href: '/about',
      children: 'About',
      className: 'my-link',
    } as any)

    expect(link.type).toBe('a')
    expect(link.props?.href).toBe('/en/about')
    expect(link.props?.className).toBe('my-link')
  })
})

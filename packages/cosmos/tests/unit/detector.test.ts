import { describe, expect, it, jest } from 'bun:test'
import { DefaultDetectors, type I18nService, localeMiddleware } from '../../src/I18nService'

describe('Locale Detectors', () => {
  const mockContext = (params: any = {}) => ({
    req: {
      param: (key: string) => params.param?.[key],
      query: (key: string) => params.query?.[key],
      header: (key: string) => params.header?.[key],
    },
    set: jest.fn(),
  })

  it('detects from route param', async () => {
    const ctx = mockContext({ param: { locale: 'fr' } })
    const detector = DefaultDetectors.find((d) => d.name === 'routeParam')!
    expect(await detector.detect(ctx)).toBe('fr')
  })

  it('detects from query', async () => {
    const ctx = mockContext({ query: { lang: 'de' } })
    const detector = DefaultDetectors.find((d) => d.name === 'query')!
    expect(await detector.detect(ctx)).toBe('de')
  })

  it('detects from header', async () => {
    const ctx = mockContext({ header: { 'Accept-Language': 'es-ES,es;q=0.9' } })
    const detector = DefaultDetectors.find((d) => d.name === 'header')!
    expect(await detector.detect(ctx)).toBe('es-ES')
  })
})

describe('Locale Middleware', () => {
  it('uses detectors in order', async () => {
    const mockManager = {
      ensureLocale: jest.fn(),
      clone: jest.fn().mockReturnValue({}),
    } as unknown as I18nService

    const middleware = localeMiddleware(mockManager, DefaultDetectors)

    const ctx1 = {
      req: {
        param: () => 'fr',
        query: () => 'de',
        header: () => 'es',
      },
      set: jest.fn(),
    }
    await middleware(ctx1 as any, async () => {})
    expect(mockManager.ensureLocale).toHaveBeenCalledWith('fr')
    expect(mockManager.clone).toHaveBeenCalledWith('fr')

    const ctx2 = {
      req: {
        param: () => undefined,
        query: () => 'de',
        header: () => 'es',
      },
      set: jest.fn(),
    }
    await middleware(ctx2 as any, async () => {})
    expect(mockManager.ensureLocale).toHaveBeenCalledWith('de')
  })
})

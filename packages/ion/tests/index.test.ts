import { describe, expect, it, mock } from 'bun:test'
import { InertiaError, InertiaErrorCodes } from '../src/errors'
import { InertiaService } from '../src/InertiaService'
import { OrbitIon } from '../src/index'

describe('InertiaService', () => {
  it('should render JSON when X-Inertia header is present', async () => {
    const req = {
      url: '/test',
      header: (key: string) => (key === 'X-Inertia' ? 'true' : undefined),
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    const result = service.render('TestComponent', { foo: 'bar' })

    expect(ctx.header).toHaveBeenCalledWith('X-Inertia', 'true')
    expect(result as any).toEqual({
      component: 'TestComponent',
      props: { foo: 'bar' },
      url: '/test',
      version: '1.0',
    })
  })

  it('should share props across renders', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    service.share('user', { name: 'Carl' })

    const result = service.render('Dashboard')

    expect((result as any).props).toEqual({
      user: { name: 'Carl' },
    })
  })

  it('should share multiple props and expose them', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    service.shareAll({ locale: 'en', feature: true })

    expect(service.getSharedProps()).toEqual({ locale: 'en', feature: true })

    const result = service.render('Dashboard')
    expect((result as any).props).toEqual({ locale: 'en', feature: true })
  })

  it('should escape page JSON for single-quoted data-page attribute', () => {
    const view = {
      render: mock((_viewName: string, data: any) => {
        return `<div id="app" data-page='${data.page}'></div>`
      }),
    }

    const req = {
      url: '/docs/guide/core-concepts',
      header: () => undefined,
    }

    const ctx = {
      req,
      get: (key: string) => (key === 'view' ? view : undefined),
      html: mock((html: string) => html),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    service.render('Docs', {
      content: `<p>He said &quot;hi&quot; & goodbye. PlanetCore's here.</p>`,
    })

    expect(view.render).toHaveBeenCalled()
    const renderCallArgs = (view.render as any).mock.calls[0]
    const viewData = renderCallArgs[1]
    const pageAttr = viewData.page

    const decoded = pageAttr.replace(/&(amp|lt|gt|quot|#039);/g, (_full: string, ent: string) => {
      switch (ent) {
        case 'amp':
          return '&'
        case 'lt':
          return '<'
        case 'gt':
          return '>'
        case 'quot':
          return '"'
        case '#039':
          return "'"
        default:
          return _full
      }
    })

    const parsed = JSON.parse(decoded)
    expect(parsed.component).toBe('Docs')
    expect(parsed.props.content).toContain('&quot;hi&quot;')
    expect(parsed.props.content).toContain("PlanetCore's")
  })
})

describe('InertiaService - Edge Cases & Boundary Tests', () => {
  it('should correctly pass rootVars to the view template', () => {
    const view = {
      render: mock((_viewName: string, data: any) => {
        return `<div data-custom="${data.customRootVar}"></div>`
      }),
    }

    const req = {
      url: '/test',
      header: () => undefined,
    }

    const ctx = {
      req,
      get: (key: string) => (key === 'view' ? view : undefined),
      html: mock((html: string) => html),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    service.render('TestComponent', { foo: 'bar' }, { customRootVar: 'testValue' })

    expect(view.render).toHaveBeenCalled()
    const renderCall = (view.render as any).mock.calls[0]
    expect(renderCall[1].customRootVar).toBe('testValue')
  })

  it('should correctly pass custom HTTP status code (201 Created)', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any, status?: number) => ({ data, status })),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    service.render('Created', { id: 123 }, {}, 201)

    expect(ctx.json).toHaveBeenCalled()
    const jsonCall = (ctx.json as any).mock.calls[0]
    expect(jsonCall[1]).toBe(201)
  })

  it('should correctly pass custom HTTP status code (404 Not Found) for HTML', () => {
    const view = {
      render: mock(() => '<html></html>'),
    }

    const req = {
      url: '/test',
      header: () => undefined,
    }

    const ctx = {
      req,
      get: (key: string) => (key === 'view' ? view : undefined),
      html: mock((html: string, status?: number) => ({ html, status })),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    service.render('NotFound', {}, {}, 404)

    expect(ctx.html).toHaveBeenCalled()
    const htmlCall = (ctx.html as any).mock.calls[0]
    expect(htmlCall[1]).toBe(404)
  })

  it('should handle URL parsing edge cases (malformed URLs)', () => {
    const req = {
      url: 'not-a-valid-url',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    const result = service.render('Test', {}) as any

    expect(result.url).toContain('not-a-valid-url')
  })

  it('should handle URLs with query parameters correctly', () => {
    const req = {
      url: 'http://localhost:3000/users?page=2&sort=name',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    const result = service.render('Users', {}) as any

    expect(result.url).toBe('/users?page=2&sort=name')
  })

  it('should escape special characters in props (<script> tags)', () => {
    const view = {
      render: mock((_viewName: string, data: any) => {
        return `<div id="app" data-page='${data.page}'></div>`
      }),
    }

    const req = {
      url: '/test',
      header: () => undefined,
    }

    const ctx = {
      req,
      get: (key: string) => (key === 'view' ? view : undefined),
      html: mock((html: string) => html),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    service.render('XSS', {
      malicious: '<script>alert("XSS")</script>',
    })

    const html = (ctx.html as any).mock.calls[0][0] as string
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })

  it('should handle undefined props gracefully', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    const result = service.render('Test', { foo: undefined, bar: 'value' }) as any

    expect(result.props.foo).toBeUndefined()
    expect(result.props.bar).toBe('value')
  })

  it('should handle null props gracefully', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    const result = service.render('Test', { foo: null, bar: 'value' }) as any

    expect(result.props.foo).toBeNull()
    expect(result.props.bar).toBe('value')
  })

  it('should execute lazy props (function-based props)', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    const lazyFn = mock(() => 'computed-value')

    const result = service.render('Test', {
      static: 'static-value',
      lazy: lazyFn,
    }) as any

    expect(lazyFn).toHaveBeenCalled()
    expect(result.props.static).toBe('static-value')
    expect(result.props.lazy).toBe('computed-value')
  })

  it('should execute shared lazy props', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    const sharedLazy = mock(() => 'shared-computed')

    service.share('computed', sharedLazy)
    const result = service.render('Test', { foo: 'bar' }) as any

    expect(sharedLazy).toHaveBeenCalled()
    expect(result.props.computed).toBe('shared-computed')
    expect(result.props.foo).toBe('bar')
  })

  it('should merge shared props with component props (component props override)', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    service.share('foo', 'shared-value')
    service.share('bar', 'bar-value')

    const result = service.render('Test', { foo: 'override' }) as any

    expect(result.props.foo).toBe('override')
    expect(result.props.bar).toBe('bar-value')
  })
})

describe('InertiaService - Error Handling', () => {
  it('should throw InertiaError.viewServiceMissing when ViewService is not available', () => {
    const req = {
      url: '/test',
      header: () => undefined,
    }

    const ctx = {
      req,
      get: () => undefined,
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })

    expect(() => service.render('Test', {})).toThrow(InertiaError)

    try {
      service.render('Test', {})
    } catch (error) {
      expect(error).toBeInstanceOf(InertiaError)
      expect((error as InertiaError).code).toBe(InertiaErrorCodes.CONFIG_VIEW_SERVICE_MISSING)
      expect((error as InertiaError).httpStatus).toBe(500)
      expect((error as InertiaError).details).toMatchObject({
        hint: expect.stringContaining('OrbitPrism'),
      })
    }
  })

  it('should throw InertiaError.serializationFailed when props contain circular references', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })

    const circular: any = { name: 'test' }
    circular.self = circular

    expect(() => service.render('Test', { data: circular })).toThrow(InertiaError)

    try {
      service.render('Test', { data: circular })
    } catch (error) {
      expect(error).toBeInstanceOf(InertiaError)
      expect((error as InertiaError).code).toBe(InertiaErrorCodes.SERIALIZATION_FAILED)
      expect((error as InertiaError).details).toMatchObject({
        component: 'Test',
        hint: expect.stringContaining('JSON-serializable'),
      })
    }
  })

  it('should throw InertiaError.serializationFailed when props contain BigInt', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })

    expect(() => service.render('Test', { bigNum: BigInt(9007199254740991) })).toThrow(InertiaError)

    try {
      service.render('Test', { bigNum: BigInt(9007199254740991) })
    } catch (error) {
      expect(error).toBeInstanceOf(InertiaError)
      expect((error as InertiaError).code).toBe(InertiaErrorCodes.SERIALIZATION_FAILED)
      expect((error as InertiaError).httpStatus).toBe(500)
    }
  })

  it('InertiaError.toJSON should return structured error data', () => {
    const error = InertiaError.viewServiceMissing()
    const json = error.toJSON()

    expect(json).toMatchObject({
      name: 'InertiaError',
      code: InertiaErrorCodes.CONFIG_VIEW_SERVICE_MISSING,
      httpStatus: 500,
      message: InertiaErrorCodes.CONFIG_VIEW_SERVICE_MISSING,
      details: {
        hint: expect.stringContaining('OrbitPrism'),
        requiredOrbit: 'OrbitPrism',
      },
    })
  })

  it('should preserve InertiaError when re-thrown from catch block', () => {
    const req = {
      url: '/test',
      header: () => undefined,
    }

    const ctx = {
      req,
      get: () => undefined,
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })

    try {
      service.render('Test', {})
    } catch (error) {
      expect(error).toBeInstanceOf(InertiaError)
      expect((error as InertiaError).code).toBe(InertiaErrorCodes.CONFIG_VIEW_SERVICE_MISSING)
    }
  })
})

describe('OrbitIon Integration', () => {
  it('should inject inertia service into context', async () => {
    // Mock Photon app-like structure
    const app = {
      use: mock((_path: string, handler: any) => {
        // Store the middleware handler to call it later
        app._middleware = handler
      }),
      _middleware: null as any,
    }

    const core = {
      app,
      adapter: app,
      logger: { info: () => {} },
      config: { get: () => '1.0.0' },
    } as any

    const orbit = new OrbitIon()
    orbit.install(core)

    // 1. Verify middleware was registered
    expect(app.use).toHaveBeenCalled()
    expect(app._middleware).toBeTypeOf('function')

    // 2. Simulate request to trigger middleware
    const ctx = {
      set: mock(),
      req: { header: () => undefined },
    } as any

    const next = mock(() => Promise.resolve())

    await app._middleware(ctx, next)

    // 3. Verify injection
    expect(ctx.set).toHaveBeenCalledWith('inertia', expect.any(Function))
    expect(next).toHaveBeenCalled()
  })
})

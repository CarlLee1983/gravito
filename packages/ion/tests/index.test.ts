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
    await service.render('TestComponent', { foo: 'bar' })

    expect(ctx.header).toHaveBeenCalledWith('X-Inertia', 'true')
    expect(ctx.json).toHaveBeenCalled()
    const jsonCall = (ctx.json as any).mock.calls[0][0]
    expect(jsonCall).toEqual({
      component: 'TestComponent',
      props: { foo: 'bar' },
      url: '/test',
      version: '1.0',
    })
  })

  it('should share props across renders', async () => {
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
    service.share('user', { name: 'Carl' })

    await service.render('Dashboard')

    const jsonCall = (ctx.json as any).mock.calls[0][0]
    expect(jsonCall.props).toEqual({
      user: { name: 'Carl' },
    })
  })

  it('should share multiple props and expose them', async () => {
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
    service.shareAll({ locale: 'en', feature: true })

    expect(service.getSharedProps()).toEqual({ locale: 'en', feature: true })

    await service.render('Dashboard')
    const jsonCall = (ctx.json as any).mock.calls[0][0]
    expect(jsonCall.props).toEqual({ locale: 'en', feature: true })
  })

  it('should escape page JSON for single-quoted data-page attribute', async () => {
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
    await service.render('Docs', {
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

  it('should support Partial Reloads with only', async () => {
    const req = {
      url: '/test',
      header: (key: string) => {
        if (key === 'X-Inertia') return 'true'
        if (key === 'X-Inertia-Partial-Data') return 'user'
        if (key === 'X-Inertia-Partial-Component') return 'Dashboard'
        return undefined
      },
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    const lazyFn = mock(() => 'skipped')

    await service.render('Dashboard', {
      user: 'Carl',
      posts: lazyFn,
    })

    const jsonCall = (ctx.json as any).mock.calls[0][0]
    expect(jsonCall.props.user).toBe('Carl')
    expect(jsonCall.props.posts).toBeUndefined()
    expect(lazyFn).not.toHaveBeenCalled()
  })

  it('should support Partial Reloads with except', async () => {
    const req = {
      url: '/test',
      header: (key: string) => {
        if (key === 'X-Inertia') return 'true'
        if (key === 'X-Inertia-Partial-Except') return 'posts'
        if (key === 'X-Inertia-Partial-Component') return 'Dashboard'
        return undefined
      },
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })
    const lazyFn = mock(() => 'skipped')

    await service.render('Dashboard', {
      user: 'Carl',
      posts: lazyFn,
    })

    const jsonCall = (ctx.json as any).mock.calls[0][0]
    expect(jsonCall.props.user).toBe('Carl')
    expect(jsonCall.props.posts).toBeUndefined()
    expect(lazyFn).not.toHaveBeenCalled()
  })

  it('should support SSR rendering', async () => {
    const view = {
      render: mock(() => '<html>SSR CONTENT</html>'),
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

    const ssrRender = mock(async () => ({
      head: ['<title>SSR Page</title>'],
      body: '<div>SSR Body</div>',
    }))

    const service = new InertiaService(ctx, {
      version: '1.0',
      ssr: {
        enabled: true,
        render: ssrRender,
      },
    })

    await service.render('Dashboard', { foo: 'bar' })

    expect(ssrRender).toHaveBeenCalled()
    expect(view.render).toHaveBeenCalledWith(
      'app',
      expect.objectContaining({
        ssrHead: '<title>SSR Page</title>',
        ssrBody: '<div>SSR Body</div>',
      }),
      expect.any(Object)
    )
  })

  it('should handle dynamic asset versioning', async () => {
    const req = {
      url: '/test',
      header: (key: string) => {
        if (key === 'X-Inertia') return 'true'
        if (key === 'X-Inertia-Version') return 'old-version'
        return undefined
      },
    }

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any

    const service = new InertiaService(ctx, {
      version: () => Promise.resolve('new-version'),
    })

    const response = await service.render('Dashboard', {})

    expect(response.status).toBe(409)
    expect(ctx.header).toHaveBeenCalledWith('X-Inertia-Location', '/test')
  })
})

describe('InertiaService - Error Handling', () => {
  it('should throw InertiaError.viewServiceMissing when ViewService is not available', async () => {
    const req = {
      url: '/test',
      header: () => undefined,
    }

    const ctx = {
      req,
      get: () => undefined,
    } as any

    const service = new InertiaService(ctx, { version: '1.0' })

    await expect(service.render('Test', {})).rejects.toThrow(InertiaError)

    try {
      await service.render('Test', {})
    } catch (error) {
      expect(error).toBeInstanceOf(InertiaError)
      expect((error as InertiaError).code).toBe(InertiaErrorCodes.CONFIG_VIEW_SERVICE_MISSING)
      expect((error as InertiaError).httpStatus).toBe(500)
      expect((error as InertiaError).details).toMatchObject({
        hint: expect.stringContaining('OrbitPrism'),
      })
    }
  })

  it('should throw InertiaError.serializationFailed when props contain circular references', async () => {
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

    const circular: any = { name: 'test' }
    circular.self = circular

    await expect(service.render('Test', { data: circular })).rejects.toThrow(InertiaError)

    try {
      await service.render('Test', { data: circular })
    } catch (error) {
      expect(error).toBeInstanceOf(InertiaError)
      expect((error as InertiaError).code).toBe(InertiaErrorCodes.SERIALIZATION_FAILED)
      expect((error as InertiaError).details).toMatchObject({
        component: 'Test',
        hint: expect.stringContaining('JSON-serializable'),
      })
    }
  })

  it('should throw InertiaError.serializationFailed when props contain BigInt', async () => {
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

    await expect(service.render('Test', { bigNum: BigInt(9007199254740991) })).rejects.toThrow(
      InertiaError
    )

    try {
      await service.render('Test', { bigNum: BigInt(9007199254740991) })
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

  it('should preserve InertiaError when re-thrown from catch block', async () => {
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
      await service.render('Test', {})
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

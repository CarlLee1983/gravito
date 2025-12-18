import { describe, expect, it, mock } from 'bun:test'
import { InertiaService } from '../src/InertiaService'
import { OrbitInertia } from '../src/index'

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
    const html = service.render('Docs', {
      content: `<p>He said &quot;hi&quot; & goodbye. PlanetCore's here.</p>`,
    }) as string

    const m = html.match(/data-page='([^']*)'/)
    expect(m).not.toBeNull()

    const attr = m![1]
    const decoded = attr.replace(/&(amp|lt|gt|quot|#039);/g, (_full, ent) => {
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

describe('OrbitInertia Integration', () => {
  it('should inject inertia service into context', async () => {
    // Mock Hono app-like structure
    const app = {
      use: mock((_path: string, handler: any) => {
        // Store the middleware handler to call it later
        app._middleware = handler
      }),
      _middleware: null as any,
    }

    const core = {
      app,
      logger: { info: () => {} },
      config: { get: () => '1.0.0' },
    } as any

    const orbit = new OrbitInertia()
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
    expect(ctx.set).toHaveBeenCalledWith('inertia', expect.any(InertiaService))
    expect(next).toHaveBeenCalled()
  })
})

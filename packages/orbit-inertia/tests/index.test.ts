import { describe, expect, it, mock } from 'bun:test';
import { InertiaService } from '../src/InertiaService';
import { OrbitInertia } from '../src/index';

describe('InertiaService', () => {
  it('should render JSON when X-Inertia header is present', async () => {
    const req = {
      url: '/test',
      header: (key: string) => (key === 'X-Inertia' ? 'true' : undefined),
    };

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any;

    const service = new InertiaService(ctx, { version: '1.0' });
    const result = service.render('TestComponent', { foo: 'bar' });

    expect(ctx.header).toHaveBeenCalledWith('X-Inertia', 'true');
    expect(result).toEqual({
      component: 'TestComponent',
      props: { foo: 'bar' },
      url: '/test',
      version: '1.0',
    });
  });

  it('should share props across renders', () => {
    const req = {
      url: '/test',
      header: () => 'true',
    };

    const ctx = {
      req,
      header: mock(),
      json: mock((data: any) => data),
    } as any;

    const service = new InertiaService(ctx, { version: '1.0' });
    service.share('user', { name: 'Carl' });

    const result = service.render('Dashboard');

    expect(result.props).toEqual({
      user: { name: 'Carl' },
    });
  });
});

describe('OrbitInertia Integration', () => {
  it('should inject inertia service into context', async () => {
    // Mock Hono app-like structure
    const app = {
      use: mock((_path: string, handler: any) => {
        // Store the middleware handler to call it later
        app._middleware = handler;
      }),
      _middleware: null as any,
    };

    const core = {
      app,
      logger: { info: () => {} },
      config: { get: () => '1.0.0' },
    } as any;

    const orbit = new OrbitInertia();
    orbit.install(core);

    // 1. Verify middleware was registered
    expect(app.use).toHaveBeenCalled();
    expect(app._middleware).toBeTypeOf('function');

    // 2. Simulate request to trigger middleware
    const ctx = {
      set: mock(),
      req: { header: () => undefined },
    } as any;

    const next = mock(() => Promise.resolve());

    await app._middleware(ctx, next);

    // 3. Verify injection
    expect(ctx.set).toHaveBeenCalledWith('inertia', expect.any(InertiaService));
    expect(next).toHaveBeenCalled();
  });
});

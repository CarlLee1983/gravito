import { describe, expect, it } from 'bun:test';
import { PlanetCore } from '../src/PlanetCore';
import { Router } from '../src/Router';

class TestController {
  index(c: any) {
    return c.text('index');
  }

  api(c: any) {
    return c.text('api');
  }
}

describe('Router', () => {
  it('should register basic routes with controller binding', async () => {
    const core = new PlanetCore();
    const router = new Router(core);

    router.get('/', [TestController, 'index']);

    const res = await core.app.request('/');
    expect(await res.text()).toBe('index');
  });

  it('should handle route groups with prefix', async () => {
    const core = new PlanetCore();
    const router = new Router(core);

    router.prefix('/api').group((r) => {
      r.get('/test', [TestController, 'api']);
    });

    const res = await core.app.request('/api/test');
    expect(await res.text()).toBe('api');
  });

  it('should handle nested groups', async () => {
    const core = new PlanetCore();
    const router = new Router(core);

    router.prefix('/api').group((api) => {
      api.prefix('/v1').group((v1) => {
        v1.get('/users', [TestController, 'api']);
      });
    });

    const res = await core.app.request('/api/v1/users');
    expect(await res.text()).toBe('api');
  });

  it('should handle middleware in groups', async () => {
    const core = new PlanetCore();
    const router = new Router(core);
    let middlewareCalled = false;

    const testMiddleware = async (_c: any, next: any) => {
      middlewareCalled = true;
      await next();
    };

    router
      .prefix('/mw')
      .middleware(testMiddleware)
      .group((r) => {
        r.get('/test', [TestController, 'api']);
      });

    const res = await core.app.request('/mw/test');
    expect(await res.text()).toBe('api');
    expect(middlewareCalled).toBe(true);
  });

  // Domain test is tricky because we need to mock Host header
  it('should handle domain routing', async () => {
    const core = new PlanetCore();
    const router = new Router(core);

    router.domain('api.example.com').group((r) => {
      r.get('/', [TestController, 'api']);
    });

    // Match
    const res1 = await core.app.request('/', { headers: { host: 'api.example.com' } });
    expect(await res1.text()).toBe('api');

    // No Match (fallback or 404)
    const res2 = await core.app.request('/', { headers: { host: 'www.example.com' } });
    expect(res2.status).toBe(404);
  });

  it('should accept middleware as array', async () => {
    const core = new PlanetCore();
    const router = new Router(core);
    const callOrder: string[] = [];

    const mw1 = async (_c: any, next: any) => {
      callOrder.push('mw1');
      await next();
    };
    const mw2 = async (_c: any, next: any) => {
      callOrder.push('mw2');
      await next();
    };
    const mw3 = async (_c: any, next: any) => {
      callOrder.push('mw3');
      await next();
    };

    // Pass array directly
    router
      .prefix('/arr')
      .middleware([mw1, mw2], mw3)
      .group((r) => {
        r.get('/test', (c) => c.text('ok'));
      });

    const res = await core.app.request('/arr/test');
    expect(await res.text()).toBe('ok');
    expect(callOrder).toEqual(['mw1', 'mw2', 'mw3']);
  });
});

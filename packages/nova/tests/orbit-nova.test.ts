import { beforeEach, describe, expect, it } from 'bun:test'
import { OrbitNova } from '../src/OrbitNova'
import { Shell } from '../src/Shell'

/**
 * Mock PlanetCore and Adapter for testing.
 * These simulate the actual Gravito framework interfaces.
 */
class MockContainer {
  private instances = new Map<string, unknown>()

  instance(key: string, value: unknown): void {
    this.instances.set(key, value)
  }

  resolve(key: string): unknown {
    return this.instances.get(key)
  }
}

class MockAdapter {
  private middlewares: Array<{
    pattern: string
    handler: (ctx: any, next: any) => Promise<void>
  }> = []

  use(pattern: string, handler: (ctx: any, next: any) => Promise<void>): void {
    this.middlewares.push({ pattern, handler })
  }

  getMiddlewares(): typeof this.middlewares {
    return this.middlewares
  }
}

class MockPlanetCore {
  container = new MockContainer()
  adapter = new MockAdapter()
}

describe('OrbitNova', () => {
  let orbit: OrbitNova
  let core: MockPlanetCore

  beforeEach(() => {
    orbit = new OrbitNova()
    core = new MockPlanetCore()
  })

  // Installation tests
  it('should install orbit and register shell in container', () => {
    orbit.install(core as any)
    const shell = core.container.resolve('shell')
    expect(shell).toBe(Shell)
  })

  it('should respect custom exposeAs option', () => {
    const customOrbit = new OrbitNova({ exposeAs: 'myshell' })
    customOrbit.install(core as any)
    const shell = core.container.resolve('myshell')
    expect(shell).toBe(Shell)
  })

  it('should use default key "shell" when exposeAs is not provided', () => {
    orbit.install(core as any)
    const shell = core.container.resolve('shell')
    expect(shell).toBeDefined()
    expect(shell).toBe(Shell)
  })

  // Middleware injection tests
  it('should register middleware to inject shell into context', () => {
    orbit.install(core as any)
    const middlewares = core.adapter.getMiddlewares()
    expect(middlewares.length).toBeGreaterThan(0)
  })

  it('should middleware inject shell with default key', async () => {
    orbit.install(core as any)
    const middlewares = core.adapter.getMiddlewares()
    const middleware = middlewares[0]

    const mockCtx = {
      data: {} as Record<string, unknown>,
      set: (key: string, value: unknown) => {
        mockCtx.data[key] = value
      },
      get: (key: string) => {
        return mockCtx.data[key]
      },
    }

    let nextCalled = false
    const nextFn = async () => {
      nextCalled = true
    }

    await middleware?.handler(mockCtx, nextFn)

    expect(nextCalled).toBe(true)
    expect(mockCtx.get('shell')).toBe(Shell)
  })

  it('should middleware inject shell with custom key', async () => {
    const customOrbit = new OrbitNova({ exposeAs: 'customshell' })
    customOrbit.install(core as any)
    const middlewares = core.adapter.getMiddlewares()
    const middleware = middlewares[0]

    const mockCtx = {
      data: {} as Record<string, unknown>,
      set: (key: string, value: unknown) => {
        mockCtx.data[key] = value
      },
      get: (key: string) => {
        return mockCtx.data[key]
      },
    }

    let nextCalled = false
    const nextFn = async () => {
      nextCalled = true
    }

    await middleware?.handler(mockCtx, nextFn)

    expect(nextCalled).toBe(true)
    expect(mockCtx.get('customshell')).toBe(Shell)
  })

  // Configuration factory tests
  it('should support static configure() factory method', () => {
    const configured = OrbitNova.configure({ exposeAs: 'test' })
    expect(configured).toBeInstanceOf(OrbitNova)
  })

  it('should create configured instance ready for installation', () => {
    const configured = OrbitNova.configure({ exposeAs: 'factory' })
    configured.install(core as any)
    const shell = core.container.resolve('factory')
    expect(shell).toBe(Shell)
  })

  // Multiple orbit instances
  it('should support multiple orbit instances with different keys', () => {
    const orbit1 = new OrbitNova({ exposeAs: 'shell1' })
    const orbit2 = new OrbitNova({ exposeAs: 'shell2' })

    orbit1.install(core as any)
    orbit2.install(core as any)

    const shell1 = core.container.resolve('shell1')
    const shell2 = core.container.resolve('shell2')

    expect(shell1).toBe(shell2) // Both are the same Shell instance
    expect(shell1).toBe(Shell)
  })

  // Middleware order tests
  it('should call next middleware in chain', async () => {
    orbit.install(core as any)
    const middlewares = core.adapter.getMiddlewares()
    const middleware = middlewares[0]

    const mockCtx = {
      data: {} as Record<string, unknown>,
      set: (key: string, value: unknown) => {
        mockCtx.data[key] = value
      },
    }

    let nextCalled = false
    const nextFn = async () => {
      nextCalled = true
    }

    await middleware?.handler(mockCtx, nextFn)

    expect(nextCalled).toBe(true)
  })

  // Stateless design test
  it('should have no state that persists between installations', () => {
    const core1 = new MockPlanetCore()
    const core2 = new MockPlanetCore()

    orbit.install(core1 as any)
    orbit.install(core2 as any)

    const shell1 = core1.container.resolve('shell')
    const shell2 = core2.container.resolve('shell')

    expect(shell1).toBe(shell2)
    expect(shell1).toBe(Shell)
  })

  // Functional tests with actual Shell instance
  it('should provide working shell instance through container', () => {
    orbit.install(core as any)
    const shell = core.container.resolve('shell') as typeof Shell

    // Verify it's the actual Shell facade with all methods
    expect(shell.run).toBeDefined()
    expect(shell.text).toBeDefined()
    expect(shell.json).toBeDefined()
    expect(shell.cmd).toBeDefined()
    expect(shell.pipe).toBeDefined()
  })

  // Middleware pattern tests
  it('should inject shell consistently across multiple contexts', async () => {
    orbit.install(core as any)
    const middlewares = core.adapter.getMiddlewares()
    const middleware = middlewares[0]

    // Simulate multiple requests
    for (let i = 0; i < 3; i++) {
      const mockCtx = {
        data: {} as Record<string, unknown>,
        set: (key: string, value: unknown) => {
          mockCtx.data[key] = value
        },
        get: (key: string) => {
          return mockCtx.data[key]
        },
      }

      await middleware?.handler(mockCtx, async () => {})
      expect(mockCtx.get('shell')).toBe(Shell)
    }
  })

  // Options handling
  it('should handle empty options gracefully', () => {
    const orbitEmpty = new OrbitNova({})
    orbitEmpty.install(core as any)
    const shell = core.container.resolve('shell')
    expect(shell).toBe(Shell)
  })

  it('should handle options with undefined values', () => {
    const orbitUndefined = new OrbitNova({ exposeAs: undefined })
    orbitUndefined.install(core as any)
    const shell = core.container.resolve('shell')
    expect(shell).toBe(Shell)
  })
})

import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { PlanetCore } from '../src/PlanetCore'

describe('PlanetCore global shutdown timeout (D-10)', () => {
  let warnMessages: string[]

  beforeEach(() => {
    warnMessages = []
  })

  it('should resolve within ~10.5s even when a provider onShutdown hangs indefinitely', async () => {
    const core = new PlanetCore()

    // Intercept logger.warn calls
    const warnSpy = spyOn(core['logger'], 'warn').mockImplementation((...args: unknown[]) => {
      warnMessages.push(args.map(String).join(' '))
    })

    // Register a provider that never resolves
    core.register({
      register: (_container) => {},
      onShutdown: (_core: PlanetCore): Promise<void> =>
        new Promise<void>(() => {
          // intentionally never resolves
        }),
    })

    await core.bootstrap()

    const start = Date.now()
    await core.shutdown()
    const elapsed = Date.now() - start

    warnSpy.mockRestore()

    // Should complete within global timeout + small buffer
    expect(elapsed).toBeLessThan(11_000)

    // Should log a warning about the global timeout
    const warnedAboutTimeout = warnMessages.some(
      (msg) =>
        msg.toLowerCase().includes('timeout') ||
        msg.toLowerCase().includes('global') ||
        msg.toLowerCase().includes('forced')
    )
    expect(warnedAboutTimeout).toBe(true)
  }, 15_000)

  it('should complete quickly and fire app:shutdown hook for normal (fast) providers', async () => {
    const core = new PlanetCore()

    let shutdownHookFired = false
    core.hooks.addAction('app:shutdown', () => {
      shutdownHookFired = true
    })

    core.register({
      register: (_container) => {},
      onShutdown: async (_core: PlanetCore): Promise<void> => {
        await new Promise<void>((resolve) => setTimeout(resolve, 10))
      },
    })

    await core.bootstrap()

    const start = Date.now()
    await core.shutdown()
    const elapsed = Date.now() - start

    // Fast provider should complete well within 1s
    expect(elapsed).toBeLessThan(1_000)
    expect(shutdownHookFired).toBe(true)
  }, 5_000)

  it('should log a warning message when the global timeout fires', async () => {
    const core = new PlanetCore()

    const warnSpy = spyOn(core['logger'], 'warn').mockImplementation((...args: unknown[]) => {
      warnMessages.push(args.map(String).join(' '))
    })

    core.register({
      register: (_container) => {},
      onShutdown: (_core: PlanetCore): Promise<void> =>
        new Promise<void>(() => {
          // never resolves
        }),
    })

    await core.bootstrap()
    await core.shutdown()

    warnSpy.mockRestore()

    // At least one warn call must reference the timeout
    expect(warnMessages.length).toBeGreaterThan(0)
    const hasTimeoutWarning = warnMessages.some(
      (msg) =>
        msg.includes('10s') ||
        msg.toLowerCase().includes('timeout') ||
        msg.toLowerCase().includes('global') ||
        msg.toLowerCase().includes('forced')
    )
    expect(hasTimeoutWarning).toBe(true)
  }, 15_000)

  it('should call all providers onShutdown in LIFO order for normal cases (no regression)', async () => {
    const core = new PlanetCore()

    const shutdownOrder: string[] = []

    core.register({
      register: (_container) => {},
      onShutdown: async (_core: PlanetCore): Promise<void> => {
        shutdownOrder.push('A')
      },
    })

    core.register({
      register: (_container) => {},
      onShutdown: async (_core: PlanetCore): Promise<void> => {
        shutdownOrder.push('B')
      },
    })

    await core.bootstrap()
    await core.shutdown()

    // LIFO order: B registered last, so it shuts down first
    expect(shutdownOrder).toEqual(['B', 'A'])
  }, 5_000)
})

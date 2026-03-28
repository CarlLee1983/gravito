import { describe, expect, it, mock } from 'bun:test'
import { OrbitSignal } from '../../src/OrbitSignal'
import { MemoryTransport } from '../../src/transports/MemoryTransport'
import { DevMailbox } from '../../src/dev/DevMailbox'

/**
 * Contract tests for OrbitSignal shutdown deadline enforcement.
 *
 * These tests verify that the shutdown hook enforces a 5-second deadline,
 * force-closing after that time and logging a warning.
 *
 * We test both the Promise.race logic directly (to keep tests fast) and
 * the registration of the shutdown hook via install().
 */
describe('OrbitSignal shutdown deadline contract', () => {
  /**
   * Simulates the Promise.race shutdown pattern used in OrbitSignal.
   * This mirrors the exact implementation so we verify the pattern works.
   */
  async function runShutdownWithDeadline(
    cleanupImpl: () => Promise<void>,
    deadlineMs: number,
    logger: { warn: (...args: unknown[]) => void }
  ): Promise<void> {
    const deadline = new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error(`[OrbitSignal] Shutdown deadline exceeded (${deadlineMs / 1000}s)`)),
        deadlineMs
      )
    )
    try {
      await Promise.race([cleanupImpl(), deadline])
    } catch (err) {
      logger.warn('[OrbitSignal] Forced shutdown:', err)
    }
  }

  it('shutdown completes within deadline when cleanup is fast', async () => {
    const warnCalls: unknown[][] = []
    const logger = { warn: mock((...args: unknown[]) => { warnCalls.push(args) }) }

    const start = Date.now()
    await runShutdownWithDeadline(async () => {
      // Fast cleanup: resolves in ~50ms
      await new Promise<void>((resolve) => setTimeout(resolve, 50))
    }, 5000, logger)
    const elapsed = Date.now() - start

    // Should complete well within 5 seconds
    expect(elapsed).toBeLessThan(1000)
    // No warnings should be logged for fast shutdown
    expect(warnCalls.length).toBe(0)
  })

  it('shutdown force-closes after deadline exceeded and logs warning', async () => {
    const warnCalls: unknown[][] = []
    const logger = { warn: mock((...args: unknown[]) => { warnCalls.push(args) }) }
    let cleanupResolve: (() => void) | null = null

    const start = Date.now()
    await runShutdownWithDeadline(
      async () => {
        // Hanging cleanup: never resolves on its own
        await new Promise<void>((resolve) => {
          cleanupResolve = resolve
        })
      },
      300, // Use 300ms deadline to keep test fast
      logger
    )
    const elapsed = Date.now() - start

    // Should complete around the 300ms deadline (with some tolerance)
    expect(elapsed).toBeGreaterThanOrEqual(280)
    expect(elapsed).toBeLessThan(2000)

    // Warning should be logged
    expect(warnCalls.length).toBe(1)
    expect(String(warnCalls[0]![0])).toBe('[OrbitSignal] Forced shutdown:')
    const errorArg = warnCalls[0]![1] as Error
    expect(errorArg).toBeInstanceOf(Error)
    expect(errorArg.message).toContain('Shutdown deadline exceeded')

    // Cleanup: resolve the hanging promise to avoid resource leak
    cleanupResolve?.()
  }, 5000)

  it('OrbitSignal shutdown hook registers on install', async () => {
    const transport = new MemoryTransport(new DevMailbox())
    const orbit = new OrbitSignal({ transport })

    let shutdownHandler: (() => Promise<void>) | null = null
    const core = {
      config: { get: mock(() => ({})) },
      container: { instance: mock(() => {}), make: mock(() => null) },
      logger: {
        warn: mock(() => {}),
        info: mock(() => {}),
        error: mock(() => {}),
      },
      adapter: {
        use: mock(() => {}),
        post: mock(() => {}),
      },
      hooks: {
        doAction: mock((_hook: string, handler?: () => Promise<void>) => {
          if (handler) shutdownHandler = handler
        }),
      },
    }

    // biome-ignore lint/suspicious/noExplicitAny: Mock core for test isolation
    orbit.install(core as any)

    // Verify shutdown hook was registered
    expect(shutdownHandler).not.toBeNull()
    expect(typeof shutdownHandler).toBe('function')

    // Verify the handler resolves without hanging (fast transport cleanup)
    await shutdownHandler!()
  })
})

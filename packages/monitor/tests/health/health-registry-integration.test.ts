import { describe, expect, it } from 'bun:test'
import { HealthRegistry } from '../../src/health/HealthRegistry'

describe('HealthRegistry integration', () => {
  it('registers multiple orbit health checks', () => {
    const registry = new HealthRegistry()
    registry.register('atlas', async () => ({ status: 'healthy' as const, details: { driver: 'postgres' } }))
    registry.register('plasma', async () => ({ status: 'healthy' as const, details: { driver: 'redis' } }))
    registry.register('stream', async () => ({ status: 'degraded' as const, details: { driver: 'kafka' } }))

    const names = registry.getCheckNames()
    expect(names.length).toBeGreaterThanOrEqual(3)
    expect(names).toContain('atlas')
    expect(names).toContain('plasma')
    expect(names).toContain('stream')
  })

  it('returns per-orbit status from check()', async () => {
    const registry = new HealthRegistry()
    registry.register('healthy-orbit', async () => ({ status: 'healthy' as const }))
    registry.register('unhealthy-orbit', async () => ({ status: 'unhealthy' as const, message: 'connection refused' }))

    const report = await registry.check()
    expect(report.status).toBe('unhealthy') // worst status wins
    expect(report.checks['healthy-orbit'].status).toBe('healthy')
    expect(report.checks['unhealthy-orbit'].status).toBe('unhealthy')
    expect(report.checks['unhealthy-orbit'].message).toBe('connection refused')
    expect(report.timestamp).toBeDefined()
    expect(report.uptime).toBeGreaterThanOrEqual(0)
  })

  it('getCheckNames() returns all registered names', () => {
    const registry = new HealthRegistry()
    registry.register('atlas', async () => ({ status: 'healthy' as const }))
    registry.register('plasma', async () => ({ status: 'healthy' as const }))
    const names = registry.getCheckNames()
    expect(names).toContain('atlas')
    expect(names).toContain('plasma')
    expect(names.length).toBe(2)
  })

  it('aggregates degraded status correctly', async () => {
    const registry = new HealthRegistry()
    registry.register('healthy-orbit', async () => ({ status: 'healthy' as const }))
    registry.register('degraded-orbit', async () => ({ status: 'degraded' as const, message: 'high latency' }))

    const report = await registry.check()
    expect(report.status).toBe('degraded')
    expect(report.checks['degraded-orbit'].message).toBe('high latency')
  })

  it('returns healthy status when all checks pass', async () => {
    const registry = new HealthRegistry()
    registry.register('stream', async () => ({ status: 'healthy' as const, details: { driver: 'redis' } }))
    registry.register('echo', async () => ({ status: 'healthy' as const, details: { dispatcher: 'configured' } }))
    registry.register('flux', async () => ({ status: 'healthy' as const, details: { storage: 'sqlite' } }))
    registry.register('radiance', async () => ({ status: 'healthy' as const, details: { driver: 'pusher' } }))
    registry.register('stasis', async () => ({ status: 'healthy' as const, details: { driver: 'redis' } }))

    const report = await registry.check()
    expect(report.status).toBe('healthy')
    expect(Object.keys(report.checks).length).toBe(5)
    for (const name of ['stream', 'echo', 'flux', 'radiance', 'stasis']) {
      expect(report.checks[name].status).toBe('healthy')
    }
  })
})

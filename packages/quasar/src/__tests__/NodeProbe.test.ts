import { describe, expect, it } from 'bun:test'
import { NodeProbe } from '../probes/NodeProbe'

describe('NodeProbe', () => {
  it('should return valid system metrics', async () => {
    const probe = new NodeProbe()
    const metrics = await probe.getMetrics()

    expect(metrics.cpu.system).toBeGreaterThanOrEqual(0)
    expect(metrics.cpu.system).toBeLessThanOrEqual(100)
    expect(metrics.memory.system.total).toBeGreaterThan(0)
    expect(metrics.pid).toBe(process.pid)
  })

  it('should detect runtime correctly', async () => {
    const probe = new NodeProbe()
    const metrics = await probe.getMetrics()

    expect(['node', 'bun', 'deno']).toContain(metrics.language || 'unknown')
  })

  it('should calculate cpu delta correctly', async () => {
    const probe = new NodeProbe()
    await probe.getMetrics()

    const start = Date.now()
    while (Date.now() - start < 100) {
      Math.random()
    }

    const metrics = await probe.getMetrics()
    expect(metrics.cpu.process).toBeGreaterThanOrEqual(0)
  })
})

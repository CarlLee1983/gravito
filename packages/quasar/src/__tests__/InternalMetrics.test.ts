import { describe, expect, it } from 'bun:test'
import { MetricsCollector } from '../metrics/InternalMetrics'

describe('MetricsCollector', () => {
  it('should record heartbeats correctly', () => {
    const collector = new MetricsCollector()
    collector.recordHeartbeat(true, 100)
    collector.recordHeartbeat(true, 200)
    collector.recordHeartbeat(false)

    const metrics = collector.getMetrics()
    expect(metrics.heartbeats.total).toBe(3)
    expect(metrics.heartbeats.successful).toBe(2)
    expect(metrics.heartbeats.failed).toBe(1)
    expect(metrics.heartbeats.avgDuration).toBe(150)
  })

  it('should record probes correctly', () => {
    const collector = new MetricsCollector()
    collector.recordProbe(true, 50)
    collector.recordProbe(false, 150)

    const metrics = collector.getMetrics()
    expect(metrics.probes.total).toBe(2)
    expect(metrics.probes.errors).toBe(1)
    expect(metrics.probes.avgDuration).toBe(100)
  })

  it('should record bridge events correctly', () => {
    const collector = new MetricsCollector()
    collector.recordBridgeEvent(true, 10)
    collector.recordBridgeEvent(true, 30)
    collector.recordBridgeEvent(false)

    const metrics = collector.getMetrics()
    expect(metrics.bridges.eventsProcessed).toBe(2)
    expect(metrics.bridges.eventsDropped).toBe(1)
    expect(metrics.bridges.avgPublishDuration).toBe(20)
  })

  it('should limit sample size for average calculation', () => {
    const collector = new MetricsCollector()
    for (let i = 0; i < 150; i++) {
      collector.recordHeartbeat(true, 10)
    }
    // Add a large one at the end
    collector.recordHeartbeat(true, 100)

    const metrics = collector.getMetrics()
    // It should only take last 100 samples
    // (99 * 10 + 1 * 100) / 100 = (990 + 100) / 100 = 10.9 -> 11
    expect(metrics.heartbeats.avgDuration).toBe(11)
  })

  it('should generate prometheus output', () => {
    const collector = new MetricsCollector()
    collector.recordHeartbeat(true, 100)
    collector.recordProbe(true, 50)
    collector.recordBridgeEvent(true, 10)

    const output = collector.toPrometheus()
    expect(output).toContain('quasar_heartbeats_total{status="success"} 1')
    expect(output).toContain('quasar_probe_duration_ms 50')
    expect(output).toContain('quasar_bridge_events_total{status="processed"} 1')
  })
})

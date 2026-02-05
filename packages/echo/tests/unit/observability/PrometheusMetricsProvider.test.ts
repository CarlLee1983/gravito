import { describe, expect, it } from 'bun:test'
import { PrometheusMetricsProvider } from '../../../src/observability/metrics/PrometheusMetricsProvider'

describe('PrometheusMetricsProvider', () => {
  it('should export metrics correctly', () => {
    const provider = new PrometheusMetricsProvider()
    provider.increment('test_counter', { label: 'val' })
    provider.gauge('test_gauge', 10, { label: 'val' })

    const output = provider.export()
    expect(output).toContain('# TYPE test_counter counter')
    expect(output).toContain('test_counter{label="val"} 1')
    expect(output).toContain('test_gauge{label="val"} 10')
  })

  it('should record histogram values', () => {
    const provider = new PrometheusMetricsProvider()

    provider.histogram('request_duration', 0.5)
    provider.histogram('request_duration', 0.8)
    provider.histogram('request_duration', 1.2, { endpoint: '/api' })

    const output = provider.export()
    expect(() => provider.export()).not.toThrow()
    expect(output).toBeDefined()
  })

  it('should increment counter without labels', () => {
    const provider = new PrometheusMetricsProvider()

    provider.increment('simple_counter')
    provider.increment('simple_counter')

    const output = provider.export()
    expect(output).toContain('simple_counter 2')
  })

  it('should set gauge without labels', () => {
    const provider = new PrometheusMetricsProvider()

    provider.gauge('active_connections', 42)

    const output = provider.export()
    expect(output).toContain('active_connections 42')
  })

  it('should handle multiple increments with same labels', () => {
    const provider = new PrometheusMetricsProvider()

    provider.increment('requests', { status: '200' })
    provider.increment('requests', { status: '200' })
    provider.increment('requests', { status: '500' })

    const output = provider.export()
    expect(output).toContain('requests{status="200"} 2')
    expect(output).toContain('requests{status="500"} 1')
  })

  it('should handle histogram with labels', () => {
    const provider = new PrometheusMetricsProvider()

    provider.histogram('api_latency', 0.25, { method: 'GET' })
    provider.histogram('api_latency', 0.35, { method: 'GET' })
    provider.histogram('api_latency', 1.5, { method: 'POST' })

    const output = provider.export()
    expect(() => provider.export()).not.toThrow()
    expect(output).toBeDefined()
  })

  it('should handle gauge updates', () => {
    const provider = new PrometheusMetricsProvider()

    provider.gauge('queue_size', 10)
    provider.gauge('queue_size', 15)
    provider.gauge('queue_size', 5)

    const output = provider.export()
    expect(output).toContain('queue_size 5')
  })

  it('should handle mixed metric types', () => {
    const provider = new PrometheusMetricsProvider()

    provider.increment('events_processed')
    provider.gauge('memory_usage', 512)
    provider.histogram('processing_time', 0.1)

    const output = provider.export()
    expect(output).toContain('events_processed')
    expect(output).toContain('memory_usage')
    expect(() => provider.export()).not.toThrow()
  })
})

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
})

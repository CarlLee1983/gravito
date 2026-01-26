import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test'
import { toPrometheusFormat } from '../src/metrics/exporters/PrometheusExporter'
import { NotificationMetricsCollector } from '../src/metrics/NotificationMetrics'

describe('NotificationMetricsCollector', () => {
  let collector: NotificationMetricsCollector

  beforeEach(() => {
    collector = new NotificationMetricsCollector()
  })

  it('should record metrics', () => {
    collector.record({
      notification: 'TestNotification',
      channel: 'mail',
      success: true,
      duration: 100,
      timestamp: new Date(),
    })

    const summary = collector.getSummary()
    expect(summary.totalSent).toBe(1)
    expect(summary.totalSuccess).toBe(1)
    expect(summary.byChannel.mail.success).toBe(1)
  })

  it('should calculate averages', () => {
    collector.record({
      notification: 'TestNotification',
      channel: 'mail',
      success: true,
      duration: 100,
      timestamp: new Date(),
    })
    collector.record({
      notification: 'TestNotification',
      channel: 'mail',
      success: true,
      duration: 200,
      timestamp: new Date(),
    })

    const summary = collector.getSummary()
    expect(summary.avgDuration).toBe(150)
    expect(summary.byChannel.mail.avgDuration).toBe(150)
  })

  it('should limit history', () => {
    const limitedCollector = new NotificationMetricsCollector(2)
    limitedCollector.record({
      notification: 'N1',
      channel: 'mail',
      success: true,
      duration: 100,
      timestamp: new Date(),
    })
    limitedCollector.record({
      notification: 'N2',
      channel: 'mail',
      success: true,
      duration: 100,
      timestamp: new Date(),
    })
    limitedCollector.record({
      notification: 'N3',
      channel: 'mail',
      success: true,
      duration: 100,
      timestamp: new Date(),
    })

    const summary = limitedCollector.getSummary()
    expect(summary.totalSent).toBe(2)
  })

  it('should export to Prometheus format', () => {
    collector.record({
      notification: 'TestNotification',
      channel: 'mail',
      success: true,
      duration: 100,
      timestamp: new Date(),
    })

    const summary = collector.getSummary()
    const output = toPrometheusFormat(summary)

    expect(output).toContain('notification_total 1')
    expect(output).toContain('notification_success_total 1')
    expect(output).toContain('notification_channel_total{channel="mail",status="success"} 1')
  })
})

import { describe, expect, it, jest } from 'bun:test'
import { ConsoleEchoLogger, type EchoLogger } from '../src/observability/logging'
import {
  EchoMetrics,
  type MetricsProvider,
  NoopMetricsProvider,
  PrometheusMetricsProvider,
} from '../src/observability/metrics'
import { NoopTracer, type Span, type Tracer } from '../src/observability/tracing'
import { WebhookReceiver } from '../src/receive/WebhookReceiver'
import { WebhookDispatcher } from '../src/send/WebhookDispatcher'

const SECRET = 'test-secret'

class MockMetricsProvider implements MetricsProvider {
  increment = jest.fn()
  histogram = jest.fn()
  gauge = jest.fn()
}

class MockTracer implements Tracer {
  startSpan = jest.fn()
  withSpan = jest.fn((name, fn) => {
    const span = {
      setAttribute: jest.fn(),
      setAttributes: jest.fn(),
      addEvent: jest.fn(),
      setStatus: jest.fn(),
      end: jest.fn(),
    }
    return fn(span)
  })
}

class MockLogger implements EchoLogger {
  debug = jest.fn()
  info = jest.fn()
  warn = jest.fn()
  error = jest.fn()
}

describe('Phase 4 Observability', () => {
  describe('WebhookReceiver Observability', () => {
    it('should emit metrics on success', async () => {
      const metrics = new MockMetricsProvider()
      const receiver = new WebhookReceiver()
      receiver.setMetrics(metrics)
      receiver.registerProvider('test', SECRET, { type: 'generic' })

      const payload = JSON.stringify({ type: 'test' })
      const signature = await import('../src/receive/SignatureValidator').then((m) =>
        m.computeHmacSha256(payload, SECRET)
      )

      await receiver.handle('test', payload, {
        'x-webhook-signature': signature,
      })

      expect(metrics.increment).toHaveBeenCalledWith(
        EchoMetrics.INCOMING_TOTAL,
        expect.objectContaining({ status: 'success' })
      )
      expect(metrics.histogram).toHaveBeenCalledWith(
        EchoMetrics.INCOMING_DURATION,
        expect.any(Number),
        expect.anything()
      )
    })

    it('should create tracing span', async () => {
      const tracer = new MockTracer()
      const receiver = new WebhookReceiver()
      receiver.setTracer(tracer as unknown as Tracer)
      receiver.registerProvider('test', SECRET, { type: 'generic' })

      const payload = JSON.stringify({ type: 'test' })
      const signature = await import('../src/receive/SignatureValidator').then((m) =>
        m.computeHmacSha256(payload, SECRET)
      )

      await receiver.handle('test', payload, {
        'x-webhook-signature': signature,
      })

      expect(tracer.withSpan).toHaveBeenCalledWith('echo.receive_webhook', expect.any(Function))
    })

    it('should log events', async () => {
      const logger = new MockLogger()
      const receiver = new WebhookReceiver()
      receiver.setLogger(logger)
      receiver.registerProvider('test', SECRET, { type: 'generic' })

      const payload = JSON.stringify({ type: 'test' })
      const signature = await import('../src/receive/SignatureValidator').then((m) =>
        m.computeHmacSha256(payload, SECRET)
      )

      await receiver.handle('test', payload, {
        'x-webhook-signature': signature,
      })

      expect(logger.debug).toHaveBeenCalledWith('Webhook received', expect.anything())
      expect(logger.info).toHaveBeenCalledWith('Webhook verified successfully', expect.anything())
    })
  })

  describe('WebhookDispatcher Observability', () => {
    it('should emit metrics on dispatch', async () => {
      const metrics = new MockMetricsProvider()
      const dispatcher = new WebhookDispatcher({ secret: SECRET })
      dispatcher.setMetrics(metrics)

      const originalFetch = globalThis.fetch
      globalThis.fetch = jest.fn(
        async () => new Response('ok', { status: 200 })
      ) as unknown as typeof fetch

      await dispatcher.dispatch({
        url: 'https://example.com',
        event: 'test',
        data: {},
      })

      globalThis.fetch = originalFetch

      expect(metrics.increment).toHaveBeenCalledWith(
        EchoMetrics.OUTGOING_TOTAL,
        expect.objectContaining({ status: 'success' })
      )
    })
  })

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
})

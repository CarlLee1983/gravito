import { describe, expect, it, jest } from 'bun:test'
import type { DeadLetterQueue } from '../../../src/dlq/DeadLetterQueue'
import type { MetricsProvider } from '../../../src/observability/metrics'
import type { Tracer } from '../../../src/observability/tracing'
import { WebhookDispatcher } from '../../../src/send/WebhookDispatcher'

describe('WebhookDispatcher', () => {
  it('should create with config', () => {
    const dispatcher = new WebhookDispatcher({
      secret: 'test-secret',
      retry: { maxAttempts: 5 },
    })

    expect(dispatcher).toBeDefined()
  })

  it('should dispatch a webhook successfully', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 1 },
      })

      const result = await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'order.created',
        data: { orderId: 123 },
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(true)
      expect(result.statusCode).toBe(200)
      expect(result.body).toBe('ok')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should not retry on non-retryable status', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => new Response('bad', { status: 400 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 2, initialDelay: 0 },
      })

      const result = await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'order.failed',
        data: { orderId: 456 },
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(400)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should retry on network error and then succeed', async () => {
    const originalFetch = globalThis.fetch
    let callCount = 0
    const fetchMock = jest.fn(async () => {
      callCount++
      if (callCount === 1) {
        throw new Error('network down')
      }
      return new Response('ok', { status: 200 })
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 2, initialDelay: 0 },
      })

      const result = await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'order.retry',
        data: { orderId: 789 },
      })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should retry on 5xx status codes', async () => {
    const originalFetch = globalThis.fetch
    let callCount = 0
    const fetchMock = jest.fn(async () => {
      callCount++
      if (callCount === 1) {
        return new Response('server error', { status: 503 })
      }
      return new Response('ok', { status: 200 })
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 2, initialDelay: 0 },
      })

      const result = await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'order.test',
        data: { orderId: 111 },
      })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should attach signature headers', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 1 },
      })

      await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'test.event',
        data: { test: true },
      })

      expect(fetchMock).toHaveBeenCalled()
      const callArgs = fetchMock.mock.calls[0]
      const init = callArgs[1] as RequestInit
      expect(init.headers).toBeDefined()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should exhaust retries and fail', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => {
      throw new Error('persistent error')
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 2, initialDelay: 0 },
      })

      const result = await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'order.fail',
        data: { orderId: 999 },
      })

      expect(result.success).toBe(false)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should use custom timeout option', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        retry: { maxAttempts: 1 },
        timeout: 5000,
      })

      const result = await dispatcher.dispatch({
        url: 'https://example.com/webhook',
        event: 'test.event',
        data: { timeout: 'test' },
      })

      expect(result.success).toBe(true)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  describe('setTracer', () => {
    it('should set tracer and return this for chaining', () => {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
      })

      const mockTracer: Tracer = {
        withSpan: async (_name, fn) =>
          fn({
            setAttributes: () => {},
            setAttribute: () => {},
            setStatus: () => {},
            addEvent: () => {},
          } as never),
      }

      const result = dispatcher.setTracer(mockTracer)
      expect(result).toBe(dispatcher)
    })
  })

  describe('setLogger', () => {
    it('should set logger and return this for chaining', () => {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
      })

      const mockLogger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
      }

      const result = dispatcher.setLogger(mockLogger)
      expect(result).toBe(dispatcher)
    })
  })

  describe('setDeadLetterQueue', () => {
    it('should set DLQ and return this for chaining', () => {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
      })

      const mockDlq: DeadLetterQueue = {
        enqueue: async () => 'id',
        dequeue: async () => {},
        peek: async () => [],
        size: async () => 0,
        clear: async () => {},
      }

      const result = dispatcher.setDeadLetterQueue(mockDlq)
      expect(result).toBe(dispatcher)
    })
  })

  describe('setMetrics', () => {
    it('should set metrics and return this for chaining', () => {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
      })

      const mockMetrics: MetricsProvider = {
        increment: () => {},
        histogram: () => {},
        gauge: () => {},
        getMetrics: async () => '',
      }

      const result = dispatcher.setMetrics(mockMetrics)
      expect(result).toBe(dispatcher)
    })
  })

  describe('dispatchBatch', () => {
    it('should dispatch batch of webhooks', async () => {
      const originalFetch = globalThis.fetch
      const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
        })

        const payloads = [
          { url: 'https://example.com/webhook1', event: 'event1', data: { id: 1 } },
          { url: 'https://example.com/webhook2', event: 'event2', data: { id: 2 } },
          { url: 'https://example.com/webhook3', event: 'event3', data: { id: 3 } },
        ]

        const result = await dispatcher.dispatchBatch(payloads)

        expect(result.total).toBe(3)
        expect(result.succeeded).toBe(3)
        expect(result.failed).toBe(0)
        expect(result.results).toHaveLength(3)
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should respect concurrency option', async () => {
      const originalFetch = globalThis.fetch
      const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
        })

        const payloads = Array.from({ length: 10 }, (_, i) => ({
          url: `https://example.com/webhook${i}`,
          event: `event${i}`,
          data: { id: i },
        }))

        const result = await dispatcher.dispatchBatch(payloads, { concurrency: 2 })

        expect(result.total).toBe(10)
        expect(result.succeeded).toBe(10)
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should stop on first failure when stopOnFirstFailure is true', async () => {
      const originalFetch = globalThis.fetch
      let callCount = 0
      const fetchMock = jest.fn(async () => {
        callCount++
        if (callCount === 2) {
          return new Response('error', { status: 500 })
        }
        return new Response('ok', { status: 200 })
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
        })

        const payloads = Array.from({ length: 5 }, (_, i) => ({
          url: `https://example.com/webhook${i}`,
          event: `event${i}`,
          data: { id: i },
        }))

        const result = await dispatcher.dispatchBatch(payloads, {
          concurrency: 1,
          stopOnFirstFailure: true,
        })

        expect(result.failed).toBeGreaterThanOrEqual(1)
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should handle partial failures', async () => {
      const originalFetch = globalThis.fetch
      let callCount = 0
      const fetchMock = jest.fn(async () => {
        callCount++
        if (callCount % 2 === 0) {
          return new Response('error', { status: 400 })
        }
        return new Response('ok', { status: 200 })
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
        })

        const payloads = [
          { url: 'https://example.com/webhook1', event: 'event1', data: {} },
          { url: 'https://example.com/webhook2', event: 'event2', data: {} },
          { url: 'https://example.com/webhook3', event: 'event3', data: {} },
        ]

        const result = await dispatcher.dispatchBatch(payloads)

        expect(result.total).toBe(3)
        expect(result.succeeded).toBe(2)
        expect(result.failed).toBe(1)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('circuit breaker', () => {
    it('should return null metrics when circuit breaker is not enabled', () => {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
      })

      const metrics = dispatcher.getCircuitBreakerMetrics('https://example.com/webhook')
      expect(metrics).toBeNull()
    })

    it('should return null metrics for unknown host', () => {
      const dispatcher = new WebhookDispatcher({
        secret: 'test-secret',
        circuitBreaker: { enabled: true, failureThreshold: 5, resetTimeout: 30000 },
      })

      const metrics = dispatcher.getCircuitBreakerMetrics('https://unknown.example.com/webhook')
      expect(metrics).toBeNull()
    })

    it('should reset circuit breaker', async () => {
      const originalFetch = globalThis.fetch
      const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
          circuitBreaker: { enabled: true, failureThreshold: 5, resetTimeout: 30000 },
        })

        await dispatcher.dispatch({
          url: 'https://example.com/webhook',
          event: 'test',
          data: {},
        })

        dispatcher.resetCircuitBreaker('https://example.com/webhook')

        const metrics = dispatcher.getCircuitBreakerMetrics('https://example.com/webhook')
        expect(metrics).not.toBeNull()
        expect(metrics?.state).toBe('CLOSED')
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should create circuit breaker per host', async () => {
      const originalFetch = globalThis.fetch
      const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
          circuitBreaker: { enabled: true, failureThreshold: 5, resetTimeout: 30000 },
        })

        await dispatcher.dispatch({
          url: 'https://host1.example.com/webhook',
          event: 'test',
          data: {},
        })
        await dispatcher.dispatch({
          url: 'https://host2.example.com/webhook',
          event: 'test',
          data: {},
        })

        const metrics1 = dispatcher.getCircuitBreakerMetrics('https://host1.example.com/test')
        const metrics2 = dispatcher.getCircuitBreakerMetrics('https://host2.example.com/test')

        expect(metrics1).not.toBeNull()
        expect(metrics2).not.toBeNull()
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should get circuit breaker metrics after dispatch', async () => {
      const originalFetch = globalThis.fetch
      const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
          circuitBreaker: { enabled: true, failureThreshold: 5, resetTimeout: 60000 },
        })

        await dispatcher.dispatch({
          url: 'https://example.com/webhook',
          event: 'test',
          data: {},
        })

        const metrics = dispatcher.getCircuitBreakerMetrics('https://example.com/webhook')
        expect(metrics).not.toBeNull()
        expect(metrics!.state).toBe('CLOSED')
        expect(metrics!.successes).toBeGreaterThanOrEqual(1)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('DLQ integration', () => {
    it('should enqueue failed events to DLQ', async () => {
      const originalFetch = globalThis.fetch
      const fetchMock = jest.fn(async () => new Response('error', { status: 500 }))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const enqueueMock = jest.fn(async () => 'dlq-id')
      const mockDlq: DeadLetterQueue = {
        enqueue: enqueueMock,
        dequeue: async () => {},
        peek: async () => [],
        size: async () => 0,
        clear: async () => {},
      }

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1, initialDelay: 0 },
        })
        dispatcher.setDeadLetterQueue(mockDlq)

        await dispatcher.dispatch({
          url: 'https://example.com/webhook',
          event: 'test.event',
          data: { test: true },
        })

        expect(enqueueMock).toHaveBeenCalled()
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('error categorization', () => {
    it('should categorize network errors', async () => {
      const originalFetch = globalThis.fetch
      const fetchMock = jest.fn(async () => {
        throw new Error('Network error')
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const incrementMock = jest.fn()
      const mockMetrics: MetricsProvider = {
        increment: incrementMock,
        histogram: () => {},
        gauge: () => {},
        getMetrics: async () => '',
      }

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
        })
        dispatcher.setMetrics(mockMetrics)

        await dispatcher.dispatch({
          url: 'https://example.com/webhook',
          event: 'test',
          data: {},
        })

        const failureCall = incrementMock.mock.calls.find(
          (call) => call[0] === 'echo_outgoing_failures_total'
        )
        expect(failureCall).toBeDefined()
        expect(failureCall[1].error_type).toBe('network_error')
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should categorize server errors', async () => {
      const originalFetch = globalThis.fetch
      const fetchMock = jest.fn(async () => new Response('error', { status: 502 }))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const incrementMock = jest.fn()
      const mockMetrics: MetricsProvider = {
        increment: incrementMock,
        histogram: () => {},
        gauge: () => {},
        getMetrics: async () => '',
      }

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
        })
        dispatcher.setMetrics(mockMetrics)

        await dispatcher.dispatch({
          url: 'https://example.com/webhook',
          event: 'test',
          data: {},
        })

        const failureCall = incrementMock.mock.calls.find(
          (call) => call[0] === 'echo_outgoing_failures_total'
        )
        expect(failureCall).toBeDefined()
        expect(failureCall[1].error_type).toBe('server_error')
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should categorize client errors', async () => {
      const originalFetch = globalThis.fetch
      const fetchMock = jest.fn(async () => new Response('error', { status: 404 }))
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const incrementMock = jest.fn()
      const mockMetrics: MetricsProvider = {
        increment: incrementMock,
        histogram: () => {},
        gauge: () => {},
        getMetrics: async () => '',
      }

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
        })
        dispatcher.setMetrics(mockMetrics)

        await dispatcher.dispatch({
          url: 'https://example.com/webhook',
          event: 'test',
          data: {},
        })

        const failureCall = incrementMock.mock.calls.find(
          (call) => call[0] === 'echo_outgoing_failures_total'
        )
        expect(failureCall).toBeDefined()
        expect(failureCall[1].error_type).toBe('client_error')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('custom webhook id', () => {
    it('should use provided webhook id', async () => {
      const originalFetch = globalThis.fetch
      let capturedHeaders: HeadersInit | undefined
      const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
        capturedHeaders = init?.headers
        return new Response('ok', { status: 200 })
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
        })

        await dispatcher.dispatch({
          id: 'custom-webhook-id-123',
          url: 'https://example.com/webhook',
          event: 'test',
          data: {},
        })

        const headers = capturedHeaders as Record<string, string>
        expect(headers['X-Webhook-ID']).toBe('custom-webhook-id-123')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('custom user agent', () => {
    it('should use custom user agent', async () => {
      const originalFetch = globalThis.fetch
      let capturedHeaders: HeadersInit | undefined
      const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
        capturedHeaders = init?.headers
        return new Response('ok', { status: 200 })
      })
      globalThis.fetch = fetchMock as unknown as typeof fetch

      try {
        const dispatcher = new WebhookDispatcher({
          secret: 'test-secret',
          retry: { maxAttempts: 1 },
          userAgent: 'Custom-Agent/2.0',
        })

        await dispatcher.dispatch({
          url: 'https://example.com/webhook',
          event: 'test',
          data: {},
        })

        const headers = capturedHeaders as Record<string, string>
        expect(headers['User-Agent']).toBe('Custom-Agent/2.0')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })
})

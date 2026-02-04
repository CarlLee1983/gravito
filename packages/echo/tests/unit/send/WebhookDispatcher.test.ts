import { describe, expect, it, jest } from 'bun:test'
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
})

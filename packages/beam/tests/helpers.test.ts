import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { Photon } from '@gravito/photon'
import { BeamError } from '../src/errors'
import { createAuthenticatedBeam, safeResponse, unwrapResponse } from '../src/helpers'

// 測試用 Photon app
const app = new Photon().get('/test', (c) => c.json({ message: 'ok' }))
type TestAppType = typeof app

describe('createAuthenticatedBeam', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('should create client with static token', async () => {
    let capturedHeaders: Headers | undefined

    const mockFetch = mock((_input: unknown, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
    })
    globalThis.fetch = mockFetch

    const client = createAuthenticatedBeam<TestAppType>(
      'http://localhost:3000',
      () => 'test-token-123'
    )

    await client.test.$get()

    expect(capturedHeaders?.get('Authorization')).toBe('Bearer test-token-123')
  })

  test('should create client with async token', async () => {
    let capturedHeaders: Headers | undefined

    const mockFetch = mock((_input: unknown, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
    })
    globalThis.fetch = mockFetch

    const client = createAuthenticatedBeam<TestAppType>('http://localhost:3000', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return 'async-token-456'
    })

    await client.test.$get()

    expect(capturedHeaders?.get('Authorization')).toBe('Bearer async-token-456')
  })

  test('should merge additional options', async () => {
    let capturedHeaders: Headers | undefined

    const mockFetch = mock((_input: unknown, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
    })
    globalThis.fetch = mockFetch

    const client = createAuthenticatedBeam<TestAppType>('http://localhost:3000', () => 'token', {
      timeout: 5000,
    })

    await client.test.$get()

    expect(capturedHeaders?.get('Authorization')).toBe('Bearer token')
  })

  test('should refresh token on each request', async () => {
    const tokens = ['token1', 'token2', 'token3']
    let callCount = 0

    const mockFetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
    )
    globalThis.fetch = mockFetch

    const client = createAuthenticatedBeam<TestAppType>(
      'http://localhost:3000',
      () => tokens[callCount++] || 'default'
    )

    await client.test.$get()
    await client.test.$get()
    await client.test.$get()

    expect(callCount).toBe(3)
  })
})

describe('unwrapResponse', () => {
  test('should return parsed JSON for successful response', async () => {
    const response = new Response(JSON.stringify({ id: 1, name: 'Test' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await unwrapResponse<{ id: number; name: string }>(response)

    expect(data).toEqual({ id: 1, name: 'Test' })
  })

  test('should throw BeamError for 4xx response', async () => {
    const response = new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
    })

    await expect(unwrapResponse(response)).rejects.toThrow(BeamError)
    await expect(unwrapResponse(response)).rejects.toThrow('Request failed with status 404')
  })

  test('should throw BeamError for 5xx response', async () => {
    const response = new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })

    await expect(unwrapResponse(response)).rejects.toThrow(BeamError)

    try {
      await unwrapResponse(response)
    } catch (error) {
      expect(error).toBeInstanceOf(BeamError)
      if (error instanceof BeamError) {
        expect(error.status).toBe(500)
      }
    }
  })

  test('should handle empty response body', async () => {
    const response = new Response('', { status: 204 })

    const data = await unwrapResponse(response)
    expect(data).toBeUndefined()
  })
})

describe('safeResponse', () => {
  test('should return data for successful response', async () => {
    const response = new Response(JSON.stringify({ id: 1, name: 'Test' }), {
      status: 200,
    })

    const result = await safeResponse<{ id: number; name: string }>(response)

    expect(result.data).toEqual({ id: 1, name: 'Test' })
    expect(result.error).toBeNull()
  })

  test('should return error for 4xx response', async () => {
    const response = new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
    })

    const result = await safeResponse(response)

    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(BeamError)
    expect(result.error?.status).toBe(404)
  })

  test('should return error for 5xx response', async () => {
    const response = new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })

    const result = await safeResponse(response)

    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(BeamError)
    expect(result.error?.status).toBe(500)
  })

  test('should return parse error for invalid JSON', async () => {
    const response = new Response('invalid json{', { status: 200 })

    const result = await safeResponse(response)

    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(BeamError)
    expect(result.error?.code).toBe('PARSE_ERROR')
  })

  test('should handle empty response', async () => {
    const response = new Response('', { status: 204 })

    const result = await safeResponse(response)

    expect(result.error).toBeNull()
  })

  test('should not throw errors', async () => {
    const response = new Response('invalid', { status: 500 })

    // 不應該拋出錯誤
    const result = await safeResponse(response)

    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(BeamError)
  })
})

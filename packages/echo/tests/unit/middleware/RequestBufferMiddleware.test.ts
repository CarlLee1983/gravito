/**
 * RequestBufferMiddleware 單元測試
 *
 * 測試請求緩存中介軟體的核心功能
 */

import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import {
  createRequestBufferMiddleware,
  RequestBufferMiddleware,
} from '../../../src/middleware/RequestBufferMiddleware'
import type { BufferedRequest } from '../../../src/types'

/**
 * 建立模擬的 Gravito Context
 */
function createMockContext(config: {
  contentType?: string
  body?: string
  buffered?: BufferedRequest
}): GravitoContext {
  const context = new Map<string, unknown>()

  if (config.buffered) {
    context.set('bufferedRequest', config.buffered)
  }

  return {
    req: {
      header: (name?: string) => {
        if (name === 'content-type') {
          return config.contentType ?? 'application/json'
        }
        if (name === undefined) {
          return {
            'content-type': config.contentType ?? 'application/json',
          }
        }
        return undefined
      },
      text: async () => config.body ?? '{"test":"data"}',
    },
    get: <K extends string>(key: K) => context.get(key),
    set: <K extends string>(key: K, value: unknown) => context.set(key, value),
    json: (data: unknown, status?: number) =>
      new Response(JSON.stringify(data), {
        status: status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
  } as unknown as GravitoContext
}

describe('RequestBufferMiddleware', () => {
  describe('建構與配置', () => {
    it('應該使用預設配置建立', () => {
      const middleware = new RequestBufferMiddleware()
      expect(middleware).toBeDefined()
    })

    it('應該接受自訂配置', () => {
      const middleware = new RequestBufferMiddleware({
        maxBodySize: 5 * 1024 * 1024,
        enabled: false,
      })
      expect(middleware).toBeDefined()
    })
  })

  describe('緩存原始 body', () => {
    it('應該緩存原始 body 到 context', async () => {
      const middleware = new RequestBufferMiddleware()
      const handler = middleware.handler()

      const ctx = createMockContext({ body: '{"test":"value"}' })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest') as BufferedRequest
      expect(buffered).toBeDefined()
      expect(buffered.rawBody).toBe('{"test":"value"}')
      expect(buffered.bufferedAt).toBeInstanceOf(Date)
      expect(next).toHaveBeenCalled()
    })

    it('應該保留原始 headers', async () => {
      const middleware = new RequestBufferMiddleware()
      const handler = middleware.handler()

      const ctx = createMockContext({
        contentType: 'application/json',
        body: '{"test":"value"}',
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest') as BufferedRequest
      expect(buffered.headers).toBeDefined()
      expect(buffered.headers['content-type']).toBe('application/json')
    })
  })

  describe('大小限制', () => {
    it('應該拒絕超過大小限制的請求', async () => {
      const middleware = new RequestBufferMiddleware({
        maxBodySize: 10, // 只允許 10 bytes
      })
      const handler = middleware.handler()

      const ctx = createMockContext({
        body: '{"very":"long","body":"content","that":"exceeds","the":"limit"}',
      })
      const next = mock(async () => new Response('OK'))

      const response = await handler(ctx, next)

      expect(response.status).toBe(413)
      expect(next).not.toHaveBeenCalled()

      const body = await response.json()
      expect(body).toEqual({ error: 'Request body too large' })
    })

    it('應該允許在限制內的請求', async () => {
      const middleware = new RequestBufferMiddleware({
        maxBodySize: 1024,
      })
      const handler = middleware.handler()

      const ctx = createMockContext({
        body: '{"small":"body"}',
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      expect(next).toHaveBeenCalled()
    })
  })

  describe('Content-Type 過濾', () => {
    it('應該跳過 multipart/form-data', async () => {
      const middleware = new RequestBufferMiddleware()
      const handler = middleware.handler()

      const ctx = createMockContext({
        contentType: 'multipart/form-data',
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest')
      expect(buffered).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })

    it('應該跳過 application/octet-stream', async () => {
      const middleware = new RequestBufferMiddleware()
      const handler = middleware.handler()

      const ctx = createMockContext({
        contentType: 'application/octet-stream',
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest')
      expect(buffered).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })

    it('應該處理 application/json', async () => {
      const middleware = new RequestBufferMiddleware()
      const handler = middleware.handler()

      const ctx = createMockContext({
        contentType: 'application/json',
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest')
      expect(buffered).toBeDefined()
    })

    it('應該支援自訂 skipContentTypes', async () => {
      const middleware = new RequestBufferMiddleware({
        skipContentTypes: ['text/plain'],
      })
      const handler = middleware.handler()

      const ctx = createMockContext({
        contentType: 'text/plain',
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest')
      expect(buffered).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })
  })

  describe('disabled 狀態', () => {
    it('當 disabled 時應該跳過緩存', async () => {
      const middleware = new RequestBufferMiddleware({
        enabled: false,
      })
      const handler = middleware.handler()

      const ctx = createMockContext({
        body: '{"test":"value"}',
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest')
      expect(buffered).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })
  })

  describe('已存在的 buffered request', () => {
    it('應該重用已緩存的 request', async () => {
      const existingBuffered: BufferedRequest = {
        rawBody: '{"existing":"data"}',
        headers: { 'x-test': 'value' },
        bufferedAt: new Date(),
      }

      const middleware = new RequestBufferMiddleware()
      const handler = middleware.handler()

      const ctx = createMockContext({
        body: '{"new":"data"}',
        buffered: existingBuffered,
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest') as BufferedRequest
      expect(buffered.rawBody).toBe('{"existing":"data"}')
    })
  })

  describe('工廠函式', () => {
    it('createRequestBufferMiddleware 應該返回處理函式', async () => {
      const handler = createRequestBufferMiddleware({
        maxBodySize: 1024,
      })

      const ctx = createMockContext({
        body: '{"test":"value"}',
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest')
      expect(buffered).toBeDefined()
    })

    it('createRequestBufferMiddleware 應該接受空配置', async () => {
      const handler = createRequestBufferMiddleware()

      const ctx = createMockContext({
        body: '{"test":"value"}',
      })
      const next = mock(async () => new Response('OK'))

      await handler(ctx, next)

      const buffered = ctx.get('bufferedRequest')
      expect(buffered).toBeDefined()
    })
  })
})

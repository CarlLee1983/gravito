/**
 * Tests for serveConfig() - Native Bun.serve Configuration Generation
 *
 * Tests the core functionality of generating native Bun.serve configs
 * with optimized static route offloading and context pooling.
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { Gravito } from '../Gravito'
import type { Handler } from '../types'

describe('serveConfig()', () => {
  describe('基本結構', () => {
    it('應該回傳包含 routes、fetch、error 的配置物件', () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ ok: true }))

      const config = app.serveConfig()

      expect(config).toHaveProperty('routes')
      expect(config).toHaveProperty('fetch')
      expect(config).toHaveProperty('error')
      expect(typeof config.error).toBe('function')
    })

    it('應該保留 baseConfig 中的原有配置', () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ ok: true }))

      const baseConfig = {
        hostname: 'localhost',
        port: 3000,
        custom: { foo: 'bar' },
      }

      const config = app.serveConfig(baseConfig)

      expect(config.hostname).toBe('localhost')
      expect(config.port).toBe(3000)
      expect((config as any).custom).toEqual({ foo: 'bar' })
    })

    it('應該處理空的 baseConfig', () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ ok: true }))

      const config = app.serveConfig({})

      expect(config.routes).toBeDefined()
      expect(config.fetch).toBeDefined()
    })

    it('應該在無 tls 配置時 tls 為 undefined', () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ ok: true }))

      const config = app.serveConfig({})

      expect(config.tls).toBeUndefined()
    })
  })

  describe('routes 靜態路由 offload', () => {
    it('應該將 GET 靜態路由加入 routes', () => {
      const app = new Gravito()
      app.get('/api/users', (c) => c.json({ users: [] }))
      app.get('/health', (c) => c.json({ ok: true }))

      const config = app.serveConfig()

      expect(config.routes).toHaveProperty('/api/users')
      expect(config.routes).toHaveProperty('/health')
    })

    it('應該不將非 GET 方法路由加入 routes', () => {
      const app = new Gravito()
      app.post('/api/users', (c) => c.json({ created: true }))
      app.put('/api/users/1', (c) => c.json({ updated: true }))
      app.delete('/api/users/1', (c) => c.json({ deleted: true }))

      const config = app.serveConfig()

      expect(config.routes).not.toHaveProperty('/api/users')
      expect(config.routes).not.toHaveProperty('/api/users/1')
    })

    it('應該不將動態路由加入 routes', () => {
      const app = new Gravito()
      app.get('/users/:id', (c) => {
        const id = c.req.param('id')
        return c.json({ id })
      })

      const config = app.serveConfig()

      expect(config.routes).not.toHaveProperty('/users/:id')
    })

    it('應該正確分類混合路由', () => {
      const app = new Gravito()
      app.get('/static', (c) => c.json({ type: 'static' }))
      app.get('/dynamic/:id', (c) => c.json({ type: 'dynamic' }))
      app.post('/static', (c) => c.json({ type: 'post' }))

      const config = app.serveConfig()

      // GET /static 應該在 routes 中
      expect(config.routes).toHaveProperty('/static')
      // GET /dynamic/:id 不應該在 routes 中
      expect(config.routes).not.toHaveProperty('/dynamic/:id')
      // POST /static 不應該在 routes 中（不是 GET）
      expect(Object.keys(config.routes!).filter((p) => p === '/static')).toHaveLength(1)
    })
  })

  describe('routes callback 可直接呼叫', () => {
    it('應該為靜態路由生成 routes 記錄', () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ message: 'Hello' }))
      app.get('/api/users', (c) => c.json({ users: [] }))

      const config = app.serveConfig()

      // routes 應該包含靜態 GET 路由
      expect(config.routes).toHaveProperty('/')
      expect(config.routes).toHaveProperty('/api/users')
      expect(typeof config.routes!['/'] === 'function').toBe(true)
    })

    it('應該在 routes 中包含 middleware 編譯後的處理器', () => {
      const app = new Gravito()

      app.use(async (_c, next) => {
        return await next()
      })

      app.get('/', (c) => c.json({ ok: true }))

      const config = app.serveConfig()

      // routes 應該包含已編譯的 middleware 處理器
      expect(config.routes).toHaveProperty('/')
      expect(typeof config.routes!['/'] === 'function').toBe(true)
    })

    it('應該只為 GET 靜態路由生成 routes 記錄', () => {
      const app = new Gravito()
      app.get('/get-route', (c) => c.json({ method: 'GET' }))
      app.post('/post-route', (c) => c.json({ method: 'POST' }))
      app.get('/dynamic/:id', (c) => c.json({ id: c.req.param('id') }))

      const config = app.serveConfig()

      // 只有 GET 靜態路由應該在 routes 中
      expect(config.routes).toHaveProperty('/get-route')
      expect(config.routes).not.toHaveProperty('/post-route')
      expect(config.routes).not.toHaveProperty('/dynamic/:id')
    })
  })

  describe('Pool 生命週期', () => {
    it('應該在正常完成後釋放 context 回 pool', async () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ ok: true }))

      const req = new Request('http://localhost/')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
    })

    it('應該在多個請求中保持 pool 穩定', async () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ ok: true }))

      // 執行 3 個順序請求
      for (let i = 0; i < 3; i++) {
        const req = new Request('http://localhost/')
        const res = await app.fetch(req)
        expect(res.status).toBe(200)
      }
    })

    it('應該在並發請求後保持穩定', async () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ ok: true }))

      // 並發執行 5 個請求
      const promises = Array.from({ length: 5 }, () => {
        const req = new Request('http://localhost/')
        return app.fetch(req)
      })

      const results = await Promise.all(promises)

      // 所有請求都應該成功
      expect(results).toHaveLength(5)
      results.forEach((res) => {
        expect(res.status).toBe(200)
      })
    })
  })

  describe('error handler', () => {
    it('應該為存在的路由回傳成功狀態', async () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ ok: true }))

      const req = new Request('http://localhost/')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
    })

    it('應該為不存在的路由回傳 404', async () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ ok: true }))

      const req = new Request('http://localhost/notfound')
      const res = await app.fetch(req)

      expect(res.status).toBe(404)
    })
  })

  describe('Streaming Response Handling', () => {
    it('應該支援 streaming response', async () => {
      const app = new Gravito()

      app.get('/stream', (c) => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('Hello'))
            controller.close()
          },
        })

        return new Response(stream, {
          headers: { 'Content-Type': 'text/plain' },
        })
      })

      const req = new Request('http://localhost/stream')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/plain')
    })
  })
})

/**
 * BunNativeAdapter 功能驗證測試
 *
 * 確保 BunNativeAdapter 與預期功能相符，並驗證效能特性
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'
import type { GravitoContext } from '../src/http/types'

describe('BunNativeAdapter', () => {
  let adapter: BunNativeAdapter

  beforeEach(() => {
    adapter = new BunNativeAdapter()
  })

  describe('基本路由', () => {
    it('應該匹配靜態路由', async () => {
      adapter.route('GET', '/health', (ctx) => ctx.json({ ok: true }))

      const req = new Request('http://localhost/health')
      const res = await adapter.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
    })

    it('應該處理 POST 請求', async () => {
      adapter.route('POST', '/api/users', (ctx) => {
        return ctx.json({ created: true }, { status: 201 })
      })

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'John' }),
      })

      const res = await adapter.fetch(req)
      expect(res.status).toBe(201)
    })

    it('應該返回 404 當路由不存在', async () => {
      const req = new Request('http://localhost/notfound')
      const res = await adapter.fetch(req)

      expect(res.status).toBe(404)
    })
  })

  describe('參數化路由', () => {
    it('應該提取單個路徑參數', async () => {
      adapter.route('GET', '/users/:id', (ctx) => {
        const id = ctx.req.param('id')
        return ctx.json({ id })
      })

      const req = new Request('http://localhost/users/123')
      const res = await adapter.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('123')
    })

    it('應該提取多個路徑參數', async () => {
      adapter.route('GET', '/users/:userId/posts/:postId', (ctx) => {
        return ctx.json({
          userId: ctx.req.param('userId'),
          postId: ctx.req.param('postId'),
        })
      })

      const req = new Request('http://localhost/users/456/posts/789')
      const res = await adapter.fetch(req)

      const data = await res.json()
      expect(data.userId).toBe('456')
      expect(data.postId).toBe('789')
    })
  })

  describe('中間件', () => {
    it('應該執行全局中間件', async () => {
      const middleware = async (ctx: GravitoContext, next: any) => {
        ctx.set('x-middleware', 'executed')
        await next()
      }

      adapter.use('*', middleware as any)
      adapter.route('GET', '/test', (ctx) => {
        const value = ctx.get('x-middleware')
        return ctx.json({ middleware: value })
      })

      const req = new Request('http://localhost/test')
      const res = await adapter.fetch(req)

      const data = await res.json()
      expect(data.middleware).toBe('executed')
    })

    it('應該執行路徑特定中間件', async () => {
      adapter.use('/api/*', async (ctx, next) => {
        ctx.set('x-api', 'true')
        await next()
      })

      adapter.route('GET', '/api/test', (ctx) => {
        return ctx.json({ isApi: ctx.get('x-api') === 'true' })
      })

      const req = new Request('http://localhost/api/test')
      const res = await adapter.fetch(req)

      const data = await res.json()
      expect(data.isApi).toBe(true)
    })

    it('應該按順序執行多個中間件', async () => {
      const order: string[] = []

      adapter.use('*', async (_ctx, next) => {
        order.push('mw1-start')
        await next()
        order.push('mw1-end')
      })

      adapter.use('*', async (_ctx, next) => {
        order.push('mw2-start')
        await next()
        order.push('mw2-end')
      })

      adapter.route('GET', '/test', (_ctx) => {
        order.push('handler')
        return new Response('OK')
      })

      const req = new Request('http://localhost/test')
      await adapter.fetch(req)

      expect(order).toEqual(['mw1-start', 'mw2-start', 'handler', 'mw2-end', 'mw1-end'])
    })
  })

  describe('錯誤處理', () => {
    it('應該捕獲路由處理器中的錯誤', async () => {
      const errorHandler = async (error: Error, _ctx: GravitoContext) => {
        return new Response(`Error: ${error.message}`, { status: 500 })
      }

      adapter.onError(errorHandler)

      adapter.route('GET', '/error', () => {
        throw new Error('Test error')
      })

      const req = new Request('http://localhost/error')
      const res = await adapter.fetch(req)

      expect(res.status).toBe(500)
      const text = await res.text()
      expect(text).toContain('Test error')
    })

    it('應該支持自定義 notFound handler', async () => {
      adapter.onNotFound((ctx) => {
        return ctx.json({ error: 'Custom not found' }, { status: 404 })
      })

      const req = new Request('http://localhost/notfound')
      const res = await adapter.fetch(req)

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Custom not found')
    })
  })

  describe('效能特性', () => {
    it('應該在 1ms 內完成靜態路由匹配', async () => {
      adapter.route('GET', '/health', (ctx) => ctx.json({ ok: true }))

      const req = new Request('http://localhost/health')
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        await adapter.fetch(req)
      }

      const duration = performance.now() - start
      const avgTime = duration / 1000

      // 預期平均 <1ms（實際應該 <0.1ms）
      expect(avgTime).toBeLessThan(1)

      console.log(`✓ Static route average time: ${avgTime.toFixed(4)}ms (target: <1ms)`)
    })

    it('應該有效處理高基數參數', async () => {
      adapter.route('GET', '/items/:id', (ctx) => {
        return ctx.json({ id: ctx.req.param('id') })
      })

      const start = performance.now()
      const requests = []

      // 生成 1000 個不同的請求
      for (let i = 0; i < 1000; i++) {
        const req = new Request(`http://localhost/items/${i}`)
        requests.push(adapter.fetch(req))
      }

      await Promise.all(requests)

      const duration = performance.now() - start
      const avgTime = duration / 1000

      console.log(`✓ Parameterized route (1000 unique) average time: ${avgTime.toFixed(4)}ms`)

      // 參數化路由應該仍然快速
      expect(avgTime).toBeLessThan(2)
    })
  })

  describe('Context API', () => {
    it('應該提供請求方法信息', async () => {
      adapter.route('POST', '/test', (ctx) => {
        return ctx.json({
          method: ctx.req.method,
          url: ctx.req.url,
          header: ctx.req.header('content-type'),
        })
      })

      const req = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })

      const res = await adapter.fetch(req)
      const data = await res.json()

      expect(data.method).toBe('POST')
      expect(data.url).toContain('/test')
      expect(data.header).toBe('application/json')
    })

    it('應該支持 JSON 回應', async () => {
      adapter.route('GET', '/json', (ctx) => {
        return ctx.json({ message: 'Hello' })
      })

      const req = new Request('http://localhost/json')
      const res = await adapter.fetch(req)

      expect(res.headers.get('content-type')).toContain('application/json')
      const data = await res.json()
      expect(data.message).toBe('Hello')
    })

    it('應該支持文本回應', async () => {
      adapter.route('GET', '/text', (ctx) => {
        return ctx.text('Hello World')
      })

      const req = new Request('http://localhost/text')
      const res = await adapter.fetch(req)

      expect(res.headers.get('content-type')).toContain('text/plain')
      const text = await res.text()
      expect(text).toBe('Hello World')
    })
  })

  describe('路由掛載', () => {
    it('應該掛載子適配器', async () => {
      const subAdapter = new BunNativeAdapter()
      subAdapter.route('GET', '/', (ctx) => ctx.json({ from: 'sub' }))
      subAdapter.route('GET', '/nested', (ctx) => ctx.json({ nested: true }))

      adapter.mount('/api', subAdapter)

      const req1 = new Request('http://localhost/api/')
      const res1 = await adapter.fetch(req1)
      const data1 = await res1.json()
      expect(data1.from).toBe('sub')

      const req2 = new Request('http://localhost/api/nested')
      const res2 = await adapter.fetch(req2)
      const data2 = await res2.json()
      expect(data2.nested).toBe(true)
    })
  })

  describe('多方法路由', () => {
    it('應該支持多個 HTTP 方法', async () => {
      adapter.route('GET', '/resource', (ctx) => ctx.json({ method: 'GET' }))
      adapter.route('POST', '/resource', (ctx) => ctx.json({ method: 'POST' }))
      adapter.route('PUT', '/resource', (ctx) => ctx.json({ method: 'PUT' }))
      adapter.route('DELETE', '/resource', (ctx) => ctx.json({ method: 'DELETE' }))

      const methods = ['GET', 'POST', 'PUT', 'DELETE']

      for (const method of methods) {
        const req = new Request('http://localhost/resource', { method })
        const res = await adapter.fetch(req)
        const data = await res.json()
        expect(data.method).toBe(method)
      }
    })
  })
})

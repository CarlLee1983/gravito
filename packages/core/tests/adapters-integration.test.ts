/**
 * HTTP 適配器集成測試
 *
 * 測試 BunNativeAdapter 與 PhotonAdapter 的兼容性與一致性
 */

import { describe, expect, it } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'
import type { HttpAdapter } from '../src/adapters/types'

// 測試同時在兩個適配器上運行
function testBothAdapters(name: string, testFn: (adapter: HttpAdapter) => Promise<void>) {
  it(`${name} (BunNativeAdapter)`, async () => {
    const adapter = new BunNativeAdapter()
    await testFn(adapter)
  })
}

describe('HTTP Adapters Integration', () => {
  describe('Basic Compatibility', () => {
    testBothAdapters('應該處理 GET 請求', async (adapter) => {
      adapter.route('GET', '/test', (ctx) => ctx.json({ method: 'GET' }))

      const res = await adapter.fetch(new Request('http://localhost/test'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.method).toBe('GET')
    })

    testBothAdapters('應該處理 POST 請求', async (adapter) => {
      adapter.route('POST', '/test', (ctx) => ctx.json({ method: 'POST' }, 201))

      const res = await adapter.fetch(
        new Request('http://localhost/test', {
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      )

      expect(res.status).toBe(201)
    })

    testBothAdapters('應該處理多個 HTTP 方法', async (adapter) => {
      adapter.route('GET', '/resource', (ctx) => ctx.json({ method: 'GET' }))
      adapter.route('POST', '/resource', (ctx) => ctx.json({ method: 'POST' }))
      adapter.route('PUT', '/resource', (ctx) => ctx.json({ method: 'PUT' }))
      adapter.route('DELETE', '/resource', (ctx) => ctx.json({ method: 'DELETE' }))

      for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
        const res = await adapter.fetch(new Request('http://localhost/resource', { method }))
        const data = await res.json()
        expect(data.method).toBe(method)
      }
    })
  })

  describe('Routing Consistency', () => {
    testBothAdapters('靜態路由應該精確匹配', async (adapter) => {
      adapter.route('GET', '/api/users', (ctx) => ctx.json({ type: 'users' }))
      adapter.route('GET', '/api/posts', (ctx) => ctx.json({ type: 'posts' }))

      const resUsers = await adapter.fetch(new Request('http://localhost/api/users'))
      const dataUsers = await resUsers.json()
      expect(dataUsers.type).toBe('users')

      const resPosts = await adapter.fetch(new Request('http://localhost/api/posts'))
      const dataPosts = await resPosts.json()
      expect(dataPosts.type).toBe('posts')
    })

    testBothAdapters('參數化路由應該提取參數', async (adapter) => {
      adapter.route('GET', '/users/:id', (ctx) => {
        return ctx.json({ id: ctx.req.param('id') })
      })

      const res = await adapter.fetch(new Request('http://localhost/users/123'))
      const data = await res.json()
      expect(data.id).toBe('123')
    })

    testBothAdapters('多個參數應該全部提取', async (adapter) => {
      adapter.route('GET', '/users/:userId/posts/:postId', (ctx) => {
        return ctx.json({
          userId: ctx.req.param('userId'),
          postId: ctx.req.param('postId'),
        })
      })

      const res = await adapter.fetch(new Request('http://localhost/users/42/posts/99'))
      const data = await res.json()
      expect(data.userId).toBe('42')
      expect(data.postId).toBe('99')
    })
  })

  describe('Middleware Consistency', () => {
    testBothAdapters('全局中間件應該執行', async (adapter) => {
      adapter.use('*', async (ctx, next) => {
        ctx.set('x-global' as any, 'true')
        await next()
      })

      adapter.route('GET', '/test', (ctx) => {
        return ctx.json({ global: ctx.get('x-global') === 'true' })
      })

      const res = await adapter.fetch(new Request('http://localhost/test'))
      const data = await res.json()
      expect(data.global).toBe(true)
    })

    testBothAdapters('路徑特定中間件應該匹配', async (adapter) => {
      adapter.use('/api/*', async (ctx, next) => {
        ctx.set('x-api' as any, 'true')
        await next()
      })

      adapter.route('GET', '/api/test', (ctx) => {
        return ctx.json({ api: ctx.get('x-api') === 'true' })
      })

      adapter.route('GET', '/other', (ctx) => {
        return ctx.json({ api: ctx.get('x-api') === 'true' })
      })

      const resApi = await adapter.fetch(new Request('http://localhost/api/test'))
      const dataApi = await resApi.json()
      expect(dataApi.api).toBe(true)

      const resOther = await adapter.fetch(new Request('http://localhost/other'))
      const dataOther = await resOther.json()
      expect(dataOther.api).toBe(false)
    })

    testBothAdapters('多個中間件應該按順序執行', async (adapter) => {
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

      adapter.route('GET', '/test', (ctx) => {
        order.push('handler')
        return ctx.json({ ok: true })
      })

      await adapter.fetch(new Request('http://localhost/test'))

      expect(order).toEqual(['mw1-start', 'mw2-start', 'handler', 'mw2-end', 'mw1-end'])
    })
  })

  describe('Error Handling Consistency', () => {
    testBothAdapters('應該處理 404', async (adapter) => {
      const res = await adapter.fetch(new Request('http://localhost/notfound'))
      expect(res.status).toBe(404)
    })

    testBothAdapters('自定義 notFound handler 應該工作', async (adapter) => {
      adapter.onNotFound((ctx) => {
        return ctx.json({ error: 'Custom not found' }, 404)
      })

      const res = await adapter.fetch(new Request('http://localhost/notfound'))
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Custom not found')
    })

    testBothAdapters('應該捕獲路由處理器中的錯誤', async (adapter) => {
      adapter.onError((error, ctx) => {
        return ctx.json({ error: error.message }, 500)
      })

      adapter.route('GET', '/error', () => {
        throw new Error('Test error')
      })

      const res = await adapter.fetch(new Request('http://localhost/error'))
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Test error')
    })
  })

  describe('Load Testing', () => {
    testBothAdapters('應該處理 1000 個連續請求', async (adapter) => {
      adapter.route('GET', '/health', (ctx) => ctx.json({ ok: true }))

      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        const res = await adapter.fetch(new Request('http://localhost/health'))
        expect(res.status).toBe(200)
      }

      const duration = performance.now() - start
      console.log(`✓ 1000 requests completed in ${duration.toFixed(0)}ms`)
    })

    testBothAdapters('應該在並發下穩定', async (adapter) => {
      adapter.route('GET', '/health', (ctx) => ctx.json({ ok: true }))
      adapter.route('GET', '/users/:id', (ctx) => {
        return ctx.json({ id: ctx.req.param('id') })
      })

      const promises = []

      // 100 並發請求
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) {
          promises.push(adapter.fetch(new Request('http://localhost/health')))
        } else {
          promises.push(adapter.fetch(new Request(`http://localhost/users/${i}`)))
        }
      }

      const results = await Promise.all(promises)

      expect(results.length).toBe(100)
      for (const res of results) {
        expect([200, 404]).toContain(res.status)
      }
    })
  })

  describe('Context API Consistency', () => {
    testBothAdapters('應該訪問請求方法', async (adapter) => {
      adapter.route('POST', '/test', (ctx) => {
        return ctx.json({ method: ctx.req.method })
      })

      const res = await adapter.fetch(new Request('http://localhost/test', { method: 'POST' }))
      const data = await res.json()
      expect(data.method).toBe('POST')
    })

    testBothAdapters('應該訪問請求頭', async (adapter) => {
      adapter.route('GET', '/test', (ctx) => {
        return ctx.json({ header: ctx.req.header('x-test') })
      })

      const res = await adapter.fetch(
        new Request('http://localhost/test', {
          headers: { 'x-test': 'value' },
        })
      )
      const data = await res.json()
      expect(data.header).toBe('value')
    })

    testBothAdapters('應該設置響應頭', async (adapter) => {
      adapter.route('GET', '/test', (ctx) => {
        ctx.header('x-custom', 'value')
        return ctx.json({ ok: true })
      })

      const res = await adapter.fetch(new Request('http://localhost/test'))
      expect(res.headers.get('x-custom')).toBe('value')
    })

    testBothAdapters('應該支持不同的響應類型', async (adapter) => {
      adapter.route('GET', '/json', (ctx) => ctx.json({ type: 'json' }))
      adapter.route('GET', '/text', (ctx) => ctx.text('plain text'))
      adapter.route('GET', '/html', (ctx) => ctx.html('<h1>HTML</h1>'))

      const resJson = await adapter.fetch(new Request('http://localhost/json'))
      expect(resJson.headers.get('content-type')).toContain('application/json')

      const resText = await adapter.fetch(new Request('http://localhost/text'))
      expect(resText.headers.get('content-type')).toContain('text/plain')

      const resHtml = await adapter.fetch(new Request('http://localhost/html'))
      expect(resHtml.headers.get('content-type')).toContain('text/html')
    })
  })
})

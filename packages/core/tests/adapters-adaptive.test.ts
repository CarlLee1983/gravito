/**
 * Adaptive Adapter Tests
 *
 * Tests for the AdaptiveAdapter that switches between BunNativeAdapter
 * and other adapters based on performance metrics.
 */

import { describe, expect, it } from 'bun:test'
import { AdaptiveAdapter } from '../src/adapters/bun/AdaptiveAdapter'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'

describe('AdaptiveAdapter', () => {
  describe('Basic Functionality', () => {
    it('應該作為代理工作', async () => {
      const adapter = new AdaptiveAdapter({ enabled: false })

      adapter.route('GET', '/test', (ctx) => ctx.json({ ok: true }))

      const res = await adapter.fetch(new Request('http://localhost/test'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
    })

    it('應該支持路由操作', async () => {
      const adapter = new AdaptiveAdapter({ enabled: false })

      adapter.route('GET', '/api/users', (ctx) => ctx.json({ users: [] }))
      adapter.route('GET', '/api/posts', (ctx) => ctx.json({ posts: [] }))

      const res1 = await adapter.fetch(new Request('http://localhost/api/users'))
      const data1 = await res1.json()
      expect(data1.users).toBeDefined()

      const res2 = await adapter.fetch(new Request('http://localhost/api/posts'))
      const data2 = await res2.json()
      expect(data2.posts).toBeDefined()
    })

    it('應該支持中間件', async () => {
      const adapter = new AdaptiveAdapter({ enabled: false })

      adapter.use('*', async (ctx, next) => {
        ctx.set('x-middleware' as any, 'true')
        await next()
      })

      adapter.route('GET', '/test', (ctx) => {
        return ctx.json({ middleware: ctx.get('x-middleware') === 'true' })
      })

      const res = await adapter.fetch(new Request('http://localhost/test'))
      const data = await res.json()
      expect(data.middleware).toBe(true)
    })
  })

  describe('Performance Metrics', () => {
    it('應該記錄請求時間', async () => {
      const adapter = new AdaptiveAdapter({ enabled: true, verbose: false })

      adapter.route('GET', '/test', (ctx) => ctx.json({ ok: true }))

      // 發送幾個請求
      for (let i = 0; i < 10; i++) {
        await adapter.fetch(new Request('http://localhost/test'))
      }

      const metrics = adapter.getMetrics()
      expect(metrics.requestCount).toBe(10)
      expect(metrics.averageTime).toBeGreaterThan(0)
      expect(metrics.p50).toBeGreaterThan(0)
      expect(metrics.p99).toBeGreaterThan(0)
    })

    it('應該計算正確的平均時間', async () => {
      const adapter = new AdaptiveAdapter({ enabled: true })

      adapter.route('GET', '/test', (ctx) => ctx.json({ ok: true }))

      // 發送請求
      for (let i = 0; i < 100; i++) {
        await adapter.fetch(new Request('http://localhost/test'))
      }

      const metrics = adapter.getMetrics()
      expect(metrics.requestCount).toBe(100)
      expect(metrics.averageTime).toBeGreaterThan(0)
      expect(metrics.averageTime).toBeLessThan(1) // 應該 < 1ms
    })

    it('應該跟蹤百分位數', async () => {
      const adapter = new AdaptiveAdapter({ enabled: true })

      adapter.route('GET', '/test', (ctx) => ctx.json({ ok: true }))

      // 發送請求
      for (let i = 0; i < 100; i++) {
        await adapter.fetch(new Request('http://localhost/test'))
      }

      const metrics = adapter.getMetrics()
      expect(metrics.p99).toBeGreaterThanOrEqual(metrics.p50)
    })
  })

  describe('Adapter Switching', () => {
    it('應該支持手動適配器切換', async () => {
      const adapter = new AdaptiveAdapter({ enabled: false })
      const native = new BunNativeAdapter()

      adapter.route('GET', '/test', (ctx) => ctx.json({ ok: true }))
      native.route('GET', '/test', (ctx) => ctx.json({ ok: true }))

      // 手動切換到 native
      adapter.switchAdapter(native)

      const res = await adapter.fetch(new Request('http://localhost/test'))
      expect(res.status).toBe(200)
    })

    it('應該重置指標', async () => {
      const adapter = new AdaptiveAdapter({ enabled: true })

      adapter.route('GET', '/test', (ctx) => ctx.json({ ok: true }))

      // 發送請求
      for (let i = 0; i < 50; i++) {
        await adapter.fetch(new Request('http://localhost/test'))
      }

      let metrics = adapter.getMetrics()
      expect(metrics.requestCount).toBe(50)

      // 重置
      adapter.resetMetrics()

      metrics = adapter.getMetrics()
      expect(metrics.requestCount).toBe(0)
      expect(metrics.averageTime).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('應該傳遞錯誤到底層適配器', async () => {
      const adapter = new AdaptiveAdapter({ enabled: false })

      adapter.onError((err, ctx) => {
        return ctx.json({ error: err.message }, 500)
      })

      adapter.route('GET', '/error', () => {
        throw new Error('Test error')
      })

      const res = await adapter.fetch(new Request('http://localhost/error'))
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Test error')
    })

    it('應該傳遞 notFound 到底層適配器', async () => {
      const adapter = new AdaptiveAdapter({ enabled: false })

      adapter.onNotFound((ctx) => {
        return ctx.json({ error: 'Not found' }, 404)
      })

      const res = await adapter.fetch(new Request('http://localhost/notfound'))
      expect(res.status).toBe(404)
    })
  })

  describe('Stress Testing', () => {
    it('應該在大量請求下保持穩定', async () => {
      const adapter = new AdaptiveAdapter({ enabled: true, verbose: false })

      adapter.route('GET', '/health', (ctx) => ctx.json({ ok: true }))
      adapter.route('GET', '/users/:id', (ctx) => ctx.json({ id: ctx.req.param('id') }))

      // 1000 個請求
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        const path = i % 2 === 0 ? '/health' : `/users/${i % 100}`
        const res = await adapter.fetch(new Request(`http://localhost${path}`))
        expect([200, 404]).toContain(res.status)
      }

      const duration = performance.now() - start
      const metrics = adapter.getMetrics()

      console.log(
        `✓ Adaptive adapter: 1000 requests in ${duration.toFixed(0)}ms, avg ${metrics.averageTime.toFixed(4)}ms`
      )

      expect(metrics.requestCount).toBe(1000)
    })
  })

  describe('Configuration', () => {
    it('應該尊重配置選項', () => {
      const adapter = new AdaptiveAdapter({
        enabled: true,
        switchThreshold: 2.0,
        minRequestsBeforeSwitch: 200,
        verbose: false,
      })

      // 驗證適配器已創建
      expect(adapter.name).toBe('adaptive')
    })

    it('應該使用默認配置', () => {
      const adapter = new AdaptiveAdapter()

      // 應該能夠執行請求
      adapter.route('GET', '/test', (ctx) => ctx.json({ ok: true }))

      expect(adapter.name).toBe('adaptive')
    })
  })
})

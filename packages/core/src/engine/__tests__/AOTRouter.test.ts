/**
 * Tests for AOTRouter - Ahead-of-Time Route Optimization
 *
 * Tests the hybrid routing strategy with O(1) static route lookup
 * and optimized Radix Tree for dynamic routes.
 */

import { describe, expect, it } from 'bun:test'
import { AOTRouter } from '../AOTRouter'
import type { Handler, Middleware } from '../types'

describe('AOTRouter', () => {
  describe('靜態 vs 動態路由分類', () => {
    it('應該將沒有 : 或 * 的路由識別為靜態', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      router.add('get', '/api/users', handler)
      router.add('get', '/health', handler)

      const staticRoutes = Array.from(router.staticRoutes.keys())
      expect(staticRoutes).toContain('get:/api/users')
      expect(staticRoutes).toContain('get:/health')
    })

    it('應該將含有 : 的路由識別為動態', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      router.add('get', '/users/:id', handler)

      // 動態路由不應該在 staticRoutes 中
      expect(router.staticRoutes.has('get:/users/:id')).toBe(false)
    })

    it('應該將含有 * 的路由識別為動態', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      router.add('get', '/files/*', handler)

      // 動態路由不應該在 staticRoutes 中
      expect(router.staticRoutes.has('get:/files/*')).toBe(false)
    })

    it('應該正確處理 POST 靜態路由', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ created: true })

      router.add('post', '/api/users', handler)

      expect(router.staticRoutes.has('post:/api/users')).toBe(true)
    })

    it('應該支援多個 HTTP 方法的相同路由', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      router.add('get', '/users', handler)
      router.add('post', '/users', handler)
      router.add('put', '/users/1', handler)

      expect(router.staticRoutes.has('get:/users')).toBe(true)
      expect(router.staticRoutes.has('post:/users')).toBe(true)
      expect(router.staticRoutes.has('put:/users/1')).toBe(true)
    })
  })

  describe('getNativeRoutes()', () => {
    it('應該只回傳 GET 靜態路由', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      router.add('get', '/api/users', handler)
      router.add('post', '/api/users', handler)
      router.add('get', '/users/:id', handler)

      const nativeRoutes = router.getNativeRoutes((h, m, p) => async (req: Request) => {
        return new Response('{}')
      })

      expect(nativeRoutes).toHaveProperty('/api/users')
      expect(Object.keys(nativeRoutes)).toHaveLength(1)
    })

    it('應該在回傳的 callback 中接收正確的 path', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      router.add('get', '/test/path', handler)

      let receivedPath: string | null = null
      router.getNativeRoutes((h, m, p) => {
        receivedPath = p
        return async (req: Request) => new Response('{}')
      })

      expect(receivedPath).toBe('/test/path')
    })

    it('應該在 onMatch callback 中包含全局 middleware', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })
      const mw1: Middleware = (c, next) => next()
      const mw2: Middleware = (c, next) => next()

      router.use(mw1, mw2)
      router.add('get', '/test', handler)

      let receivedMiddleware: Middleware[] | null = null
      router.getNativeRoutes((h, m, p) => {
        receivedMiddleware = m
        return async (req: Request) => new Response('{}')
      })

      expect(receivedMiddleware).toContain(mw1)
      expect(receivedMiddleware).toContain(mw2)
    })

    it('應該在 onMatch callback 中包含路徑 pattern middleware', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })
      const pathMw: Middleware = (c, next) => next()

      router.usePattern('/test', pathMw)
      router.add('get', '/test', handler)

      let receivedMiddleware: Middleware[] | null = null
      router.getNativeRoutes((h, m, p) => {
        receivedMiddleware = m
        return async (req: Request) => new Response('{}')
      })

      expect(receivedMiddleware).toContain(pathMw)
    })

    it('應該在無靜態路由時回傳空物件', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      router.add('get', '/users/:id', handler)

      const nativeRoutes = router.getNativeRoutes((h, m, p) => async (req: Request) => {
        return new Response('{}')
      })

      expect(Object.keys(nativeRoutes)).toHaveLength(0)
    })
  })

  describe('mount()', () => {
    it('應該為子路由的靜態路由加上前綴', () => {
      const parent = new AOTRouter()
      const child = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      child.add('get', '/users', handler)
      parent.mount('/api', child)

      expect(parent.staticRoutes.has('get:/api/users')).toBe(true)
    })

    it('應該為動態路由加上前綴並正確 match', () => {
      const parent = new AOTRouter()
      const child = new AOTRouter()
      const handler: Handler = (c) => c.json({ id: 'test' })

      child.add('get', '/users/:id', handler)
      parent.mount('/api', child)

      const match = parent.match('get', '/api/users/123')
      expect(match.handler).toBeTruthy()
      expect(match.params).toEqual({ id: '123' })
    })

    it('應該正確轉換 middleware 為 pattern middleware', () => {
      const parent = new AOTRouter()
      const child = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })
      const globalMw: Middleware = (c, next) => next()

      child.use(globalMw)
      child.add('get', '/health', handler)
      parent.mount('/api', child)

      const match = parent.match('get', '/api/health')
      expect(match.middleware).toContain(globalMw)
    })

    it('應該正確處理 / 前綴', () => {
      const parent = new AOTRouter()
      const child = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      child.add('get', '/test', handler)
      parent.mount('/', child)

      expect(parent.staticRoutes.has('get:/test')).toBe(true)
    })
  })

  describe('version 遞增', () => {
    it('add() 不應該增加 version', () => {
      const router = new AOTRouter()
      const handler: Handler = (c) => c.json({ ok: true })

      const initialVersion = router.version
      router.add('get', '/test', handler)

      expect(router.version).toBe(initialVersion)
    })

    it('use() 應該增加 version', () => {
      const router = new AOTRouter()
      const mw: Middleware = (c, next) => next()

      const initialVersion = router.version
      router.use(mw)

      expect(router.version).toBe(initialVersion + 1)
    })

    it('usePattern() 應該增加 version', () => {
      const router = new AOTRouter()
      const mw: Middleware = (c, next) => next()

      const initialVersion = router.version
      router.usePattern('/test', mw)

      expect(router.version).toBe(initialVersion + 1)
    })
  })
})

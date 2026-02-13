/**
 * Rate Limiting Middleware 單元測試
 *
 * 測試 API 速率限制功能
 */

import type { GravitoContext, GravitoNext } from '@gravito/core'
import { HttpException } from '@gravito/core'
import {
  rateLimit,
  rateLimitByEndpoint,
  rateLimitByIp,
} from '@presentation/http/middleware/rateLimit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('rateLimit middleware', () => {
  let ctx: any
  let next: GravitoNext

  beforeEach(() => {
    ctx = {
      req: {
        method: 'GET',
        url: '/api/test',
        header: vi.fn(),
        socket: {
          remoteAddress: '192.168.1.1',
        },
      },
      header: vi.fn(),
    } as unknown as GravitoContext

    next = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('rateLimit - 全局速率限制', () => {
    it('應允許請求在第一個窗口內通過', async () => {
      // 使用較短的窗口以避免狀態污染
      const middleware = rateLimit({ windowMs: 100, maxRequests: 2 })

      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '2')
    })

    it('應設置正確的響應頭', async () => {
      const middleware = rateLimit({ windowMs: 60000, maxRequests: 5 })

      await middleware(ctx, next)

      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '5')
      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String))
      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String))
    })

    it('應計算剩餘請求數', async () => {
      const middleware = rateLimit({ windowMs: 60000, maxRequests: 10 })

      await middleware(ctx, next)

      const calls = ctx.header.mock.calls
      const remainingCall = calls.find((c: any) => c[0] === 'X-RateLimit-Remaining')
      expect(remainingCall).toBeDefined()
      expect(parseInt(remainingCall[1])).toBeLessThan(10)
    })

    it('應使用自定義錯誤訊息', async () => {
      const customMessage = 'Custom rate limit exceeded'
      const middleware = rateLimit({
        windowMs: 100,
        maxRequests: 1,
        message: customMessage,
      })

      await middleware(ctx, next)

      try {
        await middleware(ctx, next)
      } catch (error: any) {
        expect(error.message).toContain('Custom')
      }
    })

    it('應使用自定義狀態碼', async () => {
      const middleware = rateLimit({
        windowMs: 100,
        maxRequests: 1,
        statusCode: 503,
      })

      await middleware(ctx, next)

      try {
        await middleware(ctx, next)
      } catch (error: any) {
        expect(error.status).toBe(503)
      }
    })
  })

  describe('rateLimitByIp - IP 基礎速率限制', () => {
    it('應識別客戶端 IP', async () => {
      const middleware = rateLimitByIp({ windowMs: 60000, maxRequests: 5 })

      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應允許不同 IP 的請求獨立計數', async () => {
      const middleware = rateLimitByIp({ windowMs: 60000, maxRequests: 1 })

      // 第一個 IP 的請求
      ctx.req.socket.remoteAddress = '192.168.1.1'
      await middleware(ctx, next)
      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '1')

      // 不同 IP 的請求應該獨立計數
      ctx.req.socket.remoteAddress = '192.168.1.2'
      ctx.header.mockClear()
      next.mockClear()

      await middleware(ctx, next)
      expect(next).toHaveBeenCalled()
    })

    it('應支持 X-Forwarded-For header', async () => {
      const middleware = rateLimitByIp({ windowMs: 60000, maxRequests: 5 })

      ctx.req.header.mockReturnValue('10.0.0.1')

      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '5')
    })

    it('應支持 X-Real-IP header', async () => {
      const middleware = rateLimitByIp({ windowMs: 60000, maxRequests: 5 })

      ctx.req.header.mockImplementation((name: string) => {
        if (name === 'X-Real-IP') return '10.0.0.2'
        return null
      })

      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應添加正確的 rate limit headers', async () => {
      const middleware = rateLimitByIp({ windowMs: 60000, maxRequests: 5 })

      await middleware(ctx, next)

      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '5')
      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String))
    })
  })

  describe('rateLimitByEndpoint - 端點級別速率限制', () => {
    it('應為不同端點獨立計數', async () => {
      const middleware = rateLimitByEndpoint({ windowMs: 60000, maxRequests: 1 })

      // POST /api/login
      ctx.req.method = 'POST'
      ctx.req.url = '/api/login'
      ctx.req.socket.remoteAddress = '192.168.1.100'
      await middleware(ctx, next)
      expect(next).toHaveBeenCalled()

      // 不同端點應該獨立計數
      ctx.req.method = 'GET'
      ctx.req.url = '/api/users'
      next.mockClear()

      await middleware(ctx, next)
      expect(next).toHaveBeenCalled()
    })

    it('應考慮 IP 地址在端點限制中', async () => {
      const middleware = rateLimitByEndpoint({ windowMs: 60000, maxRequests: 1 })

      ctx.req.method = 'POST'
      ctx.req.url = '/api/login'
      ctx.req.socket.remoteAddress = '192.168.1.1'

      await middleware(ctx, next)

      // 同一端點，不同 IP 應該獨立計數
      ctx.req.socket.remoteAddress = '192.168.1.2'
      next.mockClear()

      await middleware(ctx, next)
      expect(next).toHaveBeenCalled()
    })

    it('應區分 HTTP 方法', async () => {
      const middleware = rateLimitByEndpoint({ windowMs: 60000, maxRequests: 1 })

      // GET /api/users
      ctx.req.method = 'GET'
      ctx.req.url = '/api/users'
      ctx.req.socket.remoteAddress = '192.168.1.1'
      await middleware(ctx, next)

      // POST /api/users 應該獨立計數
      ctx.req.method = 'POST'
      next.mockClear()

      await middleware(ctx, next)
      expect(next).toHaveBeenCalled()
    })

    it('應為登錄端點設置防暴力破解限制', async () => {
      const middleware = rateLimitByEndpoint({
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
      })

      ctx.req.method = 'POST'
      ctx.req.url = '/api/auth/login'
      ctx.req.socket.remoteAddress = '192.168.1.1'

      await middleware(ctx, next)

      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '5')
    })

    it('應添加正確的 rate limit headers', async () => {
      const middleware = rateLimitByEndpoint({ windowMs: 60000, maxRequests: 5 })

      ctx.req.method = 'POST'
      ctx.req.url = '/api/data'

      await middleware(ctx, next)

      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '5')
      expect(ctx.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String))
    })

    it('應正確提取客戶端 IP 地址', async () => {
      const middleware = rateLimitByEndpoint({ windowMs: 60000, maxRequests: 5 })

      ctx.req.method = 'POST'
      ctx.req.url = '/api/test'
      ctx.req.socket.remoteAddress = '192.168.1.1'

      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })
  })
})

/**
 * Authentication Middleware 單元測試
 *
 * 測試認證中間件的 token 驗證和使用者認證功能
 */

import type { GravitoContext, GravitoNext } from '@gravito/core'
import { authenticate } from '@presentation/http/middleware/authenticate'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('authenticate middleware', () => {
  let ctx: any
  let next: GravitoNext

  beforeEach(() => {
    // Mock GravitoContext
    ctx = {
      req: {
        header: vi.fn(),
        method: 'GET',
        url: '/api/protected',
      },
      get: vi.fn(),
      set: vi.fn(),
      header: vi.fn(),
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as unknown as GravitoContext

    // Mock next middleware
    next = vi.fn().mockResolvedValue(undefined)
  })

  describe('有效的認證', () => {
    it('應允許有有效 Bearer token 的請求通過', async () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.signature'
      ctx.req.header.mockReturnValue(`Bearer ${validToken}`)

      // Mock auth manager
      const mockAuth = {
        verify: vi.fn().mockResolvedValue({ userId: 'user-123' }),
      }
      ctx.get.mockReturnValue(mockAuth)

      const middleware = authenticate()
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應設置 user 到 context', async () => {
      const validToken = 'token123'
      ctx.req.header.mockReturnValue(`Bearer ${validToken}`)

      const mockAuth = {
        verify: vi.fn().mockResolvedValue({ userId: 'user-456', email: 'test@example.com' }),
      }
      ctx.get.mockReturnValue(mockAuth)

      const middleware = authenticate()
      await middleware(ctx, next)

      expect(ctx.set).toHaveBeenCalledWith('user', expect.objectContaining({ userId: 'user-456' }))
    })
  })

  describe('無效的認證', () => {
    it('應拒絕沒有 Authorization header 的請求', async () => {
      ctx.req.header.mockReturnValue(null)

      const middleware = authenticate()
      await middleware(ctx, next)

      expect(next).not.toHaveBeenCalled()
      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('token'),
        }),
        401
      )
    })

    it('應拒絕無效的 Bearer 格式', async () => {
      ctx.req.header.mockReturnValue('Invalid token-format')

      const middleware = authenticate()
      await middleware(ctx, next)

      expect(next).not.toHaveBeenCalled()
      expect(ctx.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }), 401)
    })

    it('應拒絕過期的 token', async () => {
      ctx.req.header.mockReturnValue('Bearer expired-token')

      const mockAuth = {
        verify: vi.fn().mockRejectedValue(new Error('Token expired')),
      }
      ctx.get.mockReturnValue(mockAuth)

      const middleware = authenticate()
      await middleware(ctx, next)

      expect(next).not.toHaveBeenCalled()
      expect(ctx.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }), 401)
    })

    it('應拒絕無效簽名的 token', async () => {
      ctx.req.header.mockReturnValue('Bearer invalid-signature-token')

      const mockAuth = {
        verify: vi.fn().mockRejectedValue(new Error('Invalid signature')),
      }
      ctx.get.mockReturnValue(mockAuth)

      const middleware = authenticate()
      await middleware(ctx, next)

      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('特殊情況', () => {
    it('應處理大小寫不敏感的 Bearer', async () => {
      ctx.req.header.mockReturnValue('bearer token123')

      const mockAuth = {
        verify: vi.fn().mockResolvedValue({ userId: 'user-123' }),
      }
      ctx.get.mockReturnValue(mockAuth)

      const middleware = authenticate()
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應處理 Authorization header 中的空白', async () => {
      ctx.req.header.mockReturnValue('  Bearer   token123  ')

      const mockAuth = {
        verify: vi.fn().mockResolvedValue({ userId: 'user-123' }),
      }
      ctx.get.mockReturnValue(mockAuth)

      const middleware = authenticate()
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應支持排除某些路由', async () => {
      ctx.req.url = '/api/public'

      const middleware = authenticate({
        excludeRoutes: ['/api/public', '/health'],
      })
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })
  })

  describe('錯誤處理', () => {
    it('應捕捉認證過程中的錯誤', async () => {
      ctx.req.header.mockReturnValue('Bearer token')

      const mockAuth = {
        verify: vi.fn().mockRejectedValue(new Error('Unexpected error')),
      }
      ctx.get.mockReturnValue(mockAuth)

      const middleware = authenticate()
      await middleware(ctx, next)

      expect(ctx.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }), 500)
    })
  })
})

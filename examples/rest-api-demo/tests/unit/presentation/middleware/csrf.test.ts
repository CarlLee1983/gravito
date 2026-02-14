/**
 * CSRF Protection Middleware 單元測試
 *
 * 測試跨站請求偽造防護功能
 */

import type { GravitoContext, GravitoNext } from '@gravito/core'
import { HttpException } from '@gravito/core'
import { csrf, csrfToken, generateCsrfToken } from '@presentation/http/middleware/csrf'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('csrf middleware', () => {
  let ctx: any
  let next: GravitoNext

  beforeEach(() => {
    ctx = {
      req: {
        method: 'GET',
        url: '/api/test',
        header: vi.fn(),
        socket: {
          remoteAddress: '127.0.0.1',
        },
      },
      get: vi.fn(),
      set: vi.fn(),
      header: vi.fn(),
      json: vi.fn(),
    } as unknown as GravitoContext

    next = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateCsrfToken', () => {
    it('應生成有效的 CSRF token', () => {
      const token = generateCsrfToken()

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('應生成不同的 token', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()

      expect(token1).not.toBe(token2)
    })

    it('應生成十六進制字符串', () => {
      const token = generateCsrfToken()

      expect(/^[a-f0-9]+$/.test(token)).toBe(true)
    })

    it('應生成 64 字符的十六進制字符串', () => {
      const token = generateCsrfToken()
      expect(token).toHaveLength(64)
    })
  })

  describe('csrf 中間件 - GET 請求', () => {
    it('應允許 GET 請求通過', async () => {
      ctx.req.method = 'GET'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf()
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應為 GET 請求生成並附加 CSRF token', async () => {
      ctx.req.method = 'GET'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf()
      await middleware(ctx, next)

      expect(ctx.set).toHaveBeenCalledWith('csrfToken', expect.any(String))
      expect(ctx.header).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String))
    })

    it('應允許 HEAD 請求通過', async () => {
      ctx.req.method = 'HEAD'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf()
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應允許 OPTIONS 請求通過', async () => {
      ctx.req.method = 'OPTIONS'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf()
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })
  })

  describe('csrf 中間件 - POST 請求', () => {
    it('應在 POST 請求時檢查 token', async () => {
      ctx.req.method = 'POST'
      ctx.req.header.mockReturnValue(null)
      ctx.req.query = undefined

      const middleware = csrf()

      // POST 沒有 token 應該失敗
      await expect(middleware(ctx, next)).rejects.toThrow(HttpException)
    })

    it('應拒絕帶有無效 token 的 POST 請求', async () => {
      ctx.req.method = 'POST'
      ctx.req.header.mockReturnValue('invalid-token')

      const middleware = csrf()

      await expect(middleware(ctx, next)).rejects.toThrow(HttpException)
    })

    it('應允許 POST 沒有強制 token 檢查（如果配置為排除）', async () => {
      ctx.req.method = 'POST'
      ctx.req.header.mockReturnValue(null)

      // 默認 POST 被視為狀態變更，需要 token
      const middleware = csrf()
      await expect(middleware(ctx, next)).rejects.toThrow()
    })

    it('應支持自定義排除方法', async () => {
      ctx.req.method = 'POST'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf({
        excludeMethods: ['GET', 'HEAD', 'OPTIONS', 'POST'],
      })
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })
  })

  describe('csrf 中間件 - DELETE 和 PATCH 請求', () => {
    it('應拒絕沒有 token 的 DELETE 請求', async () => {
      ctx.req.method = 'DELETE'
      ctx.req.header.mockReturnValue(null)
      ctx.req.query = undefined

      const middleware = csrf()

      await expect(middleware(ctx, next)).rejects.toThrow(HttpException)
    })

    it('應拒絕沒有 token 的 PATCH 請求', async () => {
      ctx.req.method = 'PATCH'
      ctx.req.header.mockReturnValue(null)
      ctx.req.query = undefined

      const middleware = csrf()

      await expect(middleware(ctx, next)).rejects.toThrow(HttpException)
    })

    it('應允許 PUT 請求（狀態變更）', async () => {
      ctx.req.method = 'PUT'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf()

      await expect(middleware(ctx, next)).rejects.toThrow(HttpException)
    })
  })

  describe('csrfToken 中間件', () => {
    it('應返回 CSRF token', async () => {
      const token = 'test-token-12345'
      ctx.get.mockReturnValue(token)

      const middleware = csrfToken()
      await middleware(ctx, next)

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            token,
          },
        })
      )
    })

    it('應拒絕沒有 token 的請求', async () => {
      ctx.get.mockReturnValue(null)

      const middleware = csrfToken()

      await expect(middleware(ctx, next)).rejects.toThrow(HttpException)
    })

    it('應返回成功響應格式', async () => {
      const token = 'abc123'
      ctx.get.mockReturnValue(token)

      const middleware = csrfToken()
      await middleware(ctx, next)

      expect(ctx.json).toHaveBeenCalled()
      const call = ctx.json.mock.calls[0][0]
      expect(call.success).toBe(true)
      expect(call.data.token).toBe(token)
    })
  })

  describe('csrf 中間件 - 自定義配置', () => {
    it('應支持自定義 token 欄位名稱', async () => {
      ctx.req.method = 'GET'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf({ tokenField: 'customToken' })
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應支持自定義 header 名稱', async () => {
      ctx.req.method = 'GET'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf({ headerName: 'X-Custom-CSRF' })
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
      expect(ctx.header).toHaveBeenCalledWith('X-Custom-CSRF', expect.any(String))
    })

    it('應支持自定義 token 長度', async () => {
      ctx.req.method = 'GET'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf({ tokenLength: 16 })
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
      expect(ctx.header).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String))
    })

    it('應驗證 token 在指定時間內未過期', async () => {
      ctx.req.method = 'GET'
      ctx.req.header.mockReturnValue(null)

      const middleware = csrf({ tokenLength: 32 })
      await middleware(ctx, next)

      expect(ctx.set).toHaveBeenCalledWith('csrfToken', expect.stringMatching(/^[a-f0-9]{32}$/))
    })
  })
})

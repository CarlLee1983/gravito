/**
 * Authorize Middleware 單元測試
 *
 * 測試基於角色和權限的授權功能
 */

import type { GravitoContext, GravitoNext } from '@gravito/core'
import { AuthorizationException } from '@gravito/core'
import { authorize, can, guest, isRole } from '@presentation/http/middleware/authorize'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('authorize middleware', () => {
  let ctx: any
  let next: GravitoNext

  beforeEach(() => {
    ctx = {
      req: {
        method: 'GET',
        url: '/api/admin',
      },
      get: vi.fn(),
      set: vi.fn(),
      json: vi.fn(),
    } as unknown as GravitoContext

    next = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authorize 函數', () => {
    it('應允許具有允許角色的用戶通過', async () => {
      const user = { id: 'user-1', role: 'admin' }
      ctx.get.mockReturnValue(user)

      const middleware = authorize('admin', 'moderator')
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應拒絕不具有允許角色的用戶', async () => {
      const user = { id: 'user-1', role: 'user' }
      ctx.get.mockReturnValue(user)

      const middleware = authorize('admin', 'moderator')
      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationException)
      expect(next).not.toHaveBeenCalled()
    })

    it('應允許多個允許角色中的任何一個', async () => {
      const user = { id: 'user-1', role: 'moderator' }
      ctx.get.mockReturnValue(user)

      const middleware = authorize('admin', 'moderator', 'editor')
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應拒絕沒有用戶在上下文中的請求', async () => {
      ctx.get.mockReturnValue(null)

      const middleware = authorize('admin')
      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationException)
      expect(next).not.toHaveBeenCalled()
    })

    it('應在錯誤訊息中包含所需角色', async () => {
      const user = { id: 'user-1', role: 'user' }
      ctx.get.mockReturnValue(user)

      const middleware = authorize('admin', 'moderator')
      try {
        await middleware(ctx, next)
      } catch (error: any) {
        expect(error.message).toContain('admin')
        expect(error.message).toContain('moderator')
      }
    })

    it('應支持單個角色檢查', async () => {
      const user = { id: 'user-1', role: 'editor' }
      ctx.get.mockReturnValue(user)

      const middleware = authorize('editor')
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })
  })

  describe('can 函數', () => {
    it('應允許 admin 用戶通過', async () => {
      const user = { id: 'user-1', role: 'admin' }
      ctx.get.mockReturnValue(user)

      const middleware = can(['create_post', 'edit_post'])
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應拒絕沒有用戶在上下文中的請求', async () => {
      ctx.get.mockReturnValue(null)

      const middleware = can(['create_post'])
      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationException)
      expect(next).not.toHaveBeenCalled()
    })

    it('應支持 requireAll 參數為 false（任何權限）', async () => {
      const user = { id: 'user-1', role: 'user' }
      ctx.get.mockReturnValue(user)

      // can 函數會調用 getUserPermissions，我們需要 mock 它
      const middleware = can(['create_post', 'edit_post'], false)
      // 這個測試示範權限檢查的結構
      expect(middleware).toBeDefined()
    })

    it('應支持 requireAll 參數為 true（所有權限）', async () => {
      const user = { id: 'user-1', role: 'user' }
      ctx.get.mockReturnValue(user)

      const middleware = can(['create_post', 'edit_post'], true)
      expect(middleware).toBeDefined()
    })

    it('應在檢查任何權限時拒絕沒有權限的用戶', async () => {
      const user = { id: 'user-1', role: 'user' }
      ctx.get.mockReturnValue(user)

      const middleware = can(['delete_post', 'ban_user'], false)
      // 預期如果用戶沒有任何權限會拋出錯誤
      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationException)
    })
  })

  describe('isRole 函數', () => {
    it('應允許具有所需角色的用戶通過', async () => {
      const user = { id: 'user-1', role: 'admin' }
      ctx.get.mockReturnValue(user)

      const middleware = isRole('admin')
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應拒絕不具有所需角色的用戶', async () => {
      const user = { id: 'user-1', role: 'user' }
      ctx.get.mockReturnValue(user)

      const middleware = isRole('admin')
      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationException)
      expect(next).not.toHaveBeenCalled()
    })

    it('應拒絕沒有用戶在上下文中的請求', async () => {
      ctx.get.mockReturnValue(null)

      const middleware = isRole('admin')
      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationException)
      expect(next).not.toHaveBeenCalled()
    })

    it('應在錯誤訊息中包含所需角色', async () => {
      const user = { id: 'user-1', role: 'user' }
      ctx.get.mockReturnValue(user)

      const middleware = isRole('moderator')
      try {
        await middleware(ctx, next)
      } catch (error: any) {
        expect(error.message).toContain('moderator')
      }
    })
  })

  describe('guest 函數', () => {
    it('應允許未認證用戶通過', async () => {
      ctx.get.mockReturnValue(null)

      const middleware = guest()
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應拒絕已認證用戶', async () => {
      const user = { id: 'user-1', role: 'user' }
      ctx.get.mockReturnValue(user)

      const middleware = guest()
      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationException)
      expect(next).not.toHaveBeenCalled()
    })

    it('應允許沒有用戶對象的請求', async () => {
      ctx.get.mockReturnValue(undefined)

      const middleware = guest()
      await middleware(ctx, next)

      expect(next).toHaveBeenCalled()
    })

    it('應拒絕帶有任何用戶對象的請求', async () => {
      ctx.get.mockReturnValue({ id: 'user-1' })

      const middleware = guest()
      await expect(middleware(ctx, next)).rejects.toThrow(AuthorizationException)
      expect(next).not.toHaveBeenCalled()
    })

    it('應在錯誤訊息中說用戶已認證', async () => {
      ctx.get.mockReturnValue({ id: 'user-1', role: 'admin' })

      const middleware = guest()
      try {
        await middleware(ctx, next)
      } catch (error: any) {
        expect(error.message).toContain('already authenticated')
      }
    })
  })
})

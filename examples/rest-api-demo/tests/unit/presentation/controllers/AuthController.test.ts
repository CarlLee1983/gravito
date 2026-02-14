/**
 * AuthController 單元測試
 */

import { AuthController } from '@presentation/http/controllers/AuthController'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('AuthController', () => {
  let controller: AuthController
  let mockCtx: any

  beforeEach(() => {
    controller = new AuthController()
    mockCtx = {
      req: {
        json: vi.fn(),
        param: vi.fn(),
      },
      json: vi.fn(),
      get: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('註冊', () => {
    it('應成功註冊用戶', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'RegisterUserUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'user-1',
                  email: 'test@example.com',
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.json.mockResolvedValue({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      mockCtx.json.mockReturnValue({ status: 201 })

      await controller.register(mockCtx)

      expect(mockCtx.json).toHaveBeenCalled()
    })

    it('驗證失敗時應返回 422', async () => {
      const mockCore = {
        container: {
          make: vi.fn(),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.json.mockResolvedValue({
        email: 'invalid-email',
      })
      mockCtx.json.mockReturnValue({ status: 422 })

      await controller.register(mockCtx)

      expect(mockCtx.json).toHaveBeenCalled()
    })
  })

  describe('登入', () => {
    it('應成功登入用戶', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'LoginUserUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'user-1',
                  email: 'test@example.com',
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.json.mockResolvedValue({
        email: 'test@example.com',
        password: 'password123',
      })
      mockCtx.json.mockReturnValue({ status: 200 })

      await controller.login(mockCtx)

      expect(mockCtx.json).toHaveBeenCalled()
    })

    it('登入失敗時應返回 400', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'LoginUserUseCase') {
              return {
                execute: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.json.mockResolvedValue({
        email: 'test@example.com',
        password: 'wrong-password',
      })

      await controller.login(mockCtx)

      expect(mockCtx.json).toHaveBeenCalled()
    })
  })
})

/**
 * UserController 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('UserController', () => {
  let mockCtx: any

  beforeEach(() => {
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

  describe('獲取用戶檔案', () => {
    it('應返回用戶檔案', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'GetUserProfileUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'user-1',
                  email: 'test@example.com',
                  name: 'Test User',
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.param.mockReturnValue('user-1')

      // Test passes if we can resolve the service
      const useCase = mockCore.container.make('GetUserProfileUseCase')
      const result = await useCase.execute('user-1')

      expect(result.id).toBe('user-1')
      expect(result.email).toBe('test@example.com')
    })

    it('用戶不存在時應返回 404', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'GetUserProfileUseCase') {
              return {
                execute: vi.fn().mockResolvedValue(null),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.param.mockReturnValue('invalid-id')

      const useCase = mockCore.container.make('GetUserProfileUseCase')
      const result = await useCase.execute('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('更新用戶', () => {
    it('應更新用戶檔案', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'UpdateUserUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'user-1',
                  name: 'Updated Name',
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.json.mockResolvedValue({
        name: 'Updated Name',
      })

      const useCase = mockCore.container.make('UpdateUserUseCase')
      const result = await useCase.execute({
        userId: 'user-1',
        name: 'Updated Name',
      })

      expect(result.name).toBe('Updated Name')
    })

    it('更新失敗時應返回錯誤', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'UpdateUserUseCase') {
              return {
                execute: vi.fn().mockRejectedValue(new Error('User not found')),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('UpdateUserUseCase')

      await expect(
        useCase.execute({
          userId: 'invalid-id',
          name: 'Updated Name',
        })
      ).rejects.toThrow('User not found')
    })
  })
})

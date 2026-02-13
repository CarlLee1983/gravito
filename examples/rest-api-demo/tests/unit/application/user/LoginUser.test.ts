/**
 * LoginUser Use Case 單元測試
 *
 * 測試用戶登入流程，包括驗證、密碼檢查、用戶狀態驗證
 */

import { LoginUserUseCase } from '@application/user/LoginUser'
import type { UserRepository } from '@infrastructure/repositories/UserRepository'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock bcrypt module before importing anything that uses it
const mockCompare = vi.fn()

vi.mock('bcrypt', () => ({
  compare: mockCompare,
}))

describe('LoginUserUseCase', () => {
  let useCase: LoginUserUseCase
  let mockUserRepository: any

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      updateLastLoginAt: vi.fn(),
    }

    useCase = new LoginUserUseCase(mockUserRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('有效登入', () => {
    it('應成功登入有效用戶', async () => {
      const request = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'user',
        status: 'active',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockCompare.mockResolvedValue(true)

      const result = await useCase.execute(request)

      expect(result.id).toBe('user-1')
      expect(result.email).toBe('test@example.com')
      expect(result.name).toBe('Test User')
      expect(result.role).toBe('user')
      expect(result.status).toBe('active')
      expect(mockUserRepository.updateLastLoginAt).toHaveBeenCalledWith('user-1')
    })

    it('應返回正確的用戶信息', async () => {
      const request = {
        email: 'admin@example.com',
        password: 'adminpass',
      }

      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'hashedPassword',
        role: 'admin',
        status: 'active',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockCompare.mockResolvedValue(true)

      const result = await useCase.execute(request)

      expect(result).toEqual({
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        status: 'active',
      })
    })

    it('應更新最後登入時間', async () => {
      const request = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'user',
        status: 'active',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockCompare.mockResolvedValue(true)

      await useCase.execute(request)

      expect(mockUserRepository.updateLastLoginAt).toHaveBeenCalledWith('user-1')
    })
  })

  describe('輸入驗證', () => {
    it('應拒絕缺少電子郵件的請求', async () => {
      const request = {
        email: '',
        password: 'password123',
      }

      await expect(useCase.execute(request)).rejects.toThrow('Email and password are required')
    })

    it('應拒絕缺少密碼的請求', async () => {
      const request = {
        email: 'test@example.com',
        password: '',
      }

      await expect(useCase.execute(request)).rejects.toThrow('Email and password are required')
    })

    it('應拒絕同時缺少電子郵件和密碼的請求', async () => {
      const request = {
        email: '',
        password: '',
      }

      await expect(useCase.execute(request)).rejects.toThrow('Email and password are required')
    })
  })

  describe('用戶查找', () => {
    it('應拒絕不存在的用戶', async () => {
      const request = {
        email: 'nonexistent@example.com',
        password: 'password123',
      }

      mockUserRepository.findByEmail.mockResolvedValue(null)

      await expect(useCase.execute(request)).rejects.toThrow('Invalid email or password')
    })

    it('應發起數據庫查詢', async () => {
      const request = {
        email: 'test@example.com',
        password: 'password123',
      }

      mockUserRepository.findByEmail.mockResolvedValue(null)

      await expect(useCase.execute(request)).rejects.toThrow()

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
    })
  })

  describe('密碼驗證', () => {
    it('應接受正確的密碼', async () => {
      const request = {
        email: 'test@example.com',
        password: 'correctPassword',
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'user',
        status: 'active',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockCompare.mockResolvedValue(true)

      const result = await useCase.execute(request)

      expect(result.id).toBe('user-1')
    })

    it('應拒絕錯誤的密碼', async () => {
      const request = {
        email: 'test@example.com',
        password: 'wrongPassword',
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'user',
        status: 'active',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockCompare.mockResolvedValue(false)

      await expect(useCase.execute(request)).rejects.toThrow('Invalid email or password')
    })

    it('應使用 bcrypt 驗證密碼', async () => {
      const request = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'user',
        status: 'active',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockCompare.mockResolvedValue(true)

      await useCase.execute(request)

      expect(mockCompare).toHaveBeenCalledWith('password123', 'hashedPassword')
    })
  })

  describe('用戶狀態驗證', () => {
    it('應拒絕非活躍用戶', async () => {
      const request = {
        email: 'inactive@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 'user-2',
        email: 'inactive@example.com',
        name: 'Inactive User',
        password: 'hashedPassword',
        role: 'user',
        status: 'inactive',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)

      await expect(useCase.execute(request)).rejects.toThrow('User account is not active')
    })

    it('應拒絕被禁用的用戶', async () => {
      const request = {
        email: 'banned@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 'user-3',
        email: 'banned@example.com',
        name: 'Banned User',
        password: 'hashedPassword',
        role: 'user',
        status: 'banned',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)

      await expect(useCase.execute(request)).rejects.toThrow('User account is not active')
    })

    it('應允許活躍用戶登入', async () => {
      const request = {
        email: 'active@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 'user-4',
        email: 'active@example.com',
        name: 'Active User',
        password: 'hashedPassword',
        role: 'user',
        status: 'active',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockCompare.mockResolvedValue(true)

      const result = await useCase.execute(request)

      expect(result.id).toBe('user-4')
    })
  })

  describe('回應格式', () => {
    it('應不返回密碼字段', async () => {
      const request = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'user',
        status: 'active',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockCompare.mockResolvedValue(true)

      const result = await useCase.execute(request)

      expect(result).not.toHaveProperty('password')
    })

    it('應返回所有必需的用戶字段', async () => {
      const request = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'user',
        status: 'active',
      }

      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockCompare.mockResolvedValue(true)

      const result = await useCase.execute(request)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('role')
      expect(result).toHaveProperty('status')
    })
  })
})

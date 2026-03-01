/**
 * RegisterUser Use Case 單元測試
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RegisterUserUseCase } from '../../../src/application/user/RegisterUser'

// Mock bcrypt
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
  compare: vi.fn().mockResolvedValue(true),
}))

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase
  let mockUserRepository: any
  let mockEventManager: any

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      findByPhone: vi.fn(),
      create: vi.fn(),
    }

    mockEventManager = {
      dispatch: vi.fn(),
    }

    useCase = new RegisterUserUseCase(mockUserRepository, mockEventManager)
  })

  describe('execute', () => {
    it('應該成功註冊新用戶', async () => {
      // Arrange
      const request = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecurePassword123!',
      }

      mockUserRepository.findByEmail.mockResolvedValue(null)
      mockUserRepository.create.mockResolvedValue({
        id: '123',
        email: request.email,
        name: request.name,
        role: 'customer',
        createdAt: new Date(),
      })

      // Act
      const result = await useCase.execute(request)

      // Assert
      expect(result.id).toBe('123')
      expect(result.email).toBe(request.email)
      expect(result.name).toBe(request.name)
      expect(mockUserRepository.create).toHaveBeenCalled()
      expect(mockEventManager.dispatch).toHaveBeenCalled()
    })

    it('應該拒絕重複的電子郵件', async () => {
      // Arrange
      const request = {
        email: 'existing@example.com',
        name: 'User',
        password: 'SecurePassword123!',
      }

      mockUserRepository.findByEmail.mockResolvedValue({ id: '456' })

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('already registered')
    })

    it('應該驗證密碼強度', async () => {
      // Arrange
      const request = {
        email: 'user@example.com',
        name: 'User',
        password: 'weak', // 密碼過弱
      }

      mockUserRepository.findByEmail.mockResolvedValue(null)

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Password must be at least')
    })

    it('應該驗證電子郵件格式', async () => {
      // Arrange
      const request = {
        email: 'invalid-email',
        name: 'User',
        password: 'SecurePassword123!',
      }

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Invalid email')
    })
  })
})

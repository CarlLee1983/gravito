/**
 * UpdateUser Use Case
 *
 * 應用層業務邏輯：更新用戶資訊
 */

import type { UpdateUserInput, User } from '@domain/user/User'
import { UserDomainService } from '@domain/user/User'
import type { UserRepository } from '@infrastructure/repositories/UserRepository'

export interface UpdateUserRequest {
  userId: string
  name?: string
  email?: string
  phone?: string
  status?: string
}

export interface UpdateUserResponse {
  id: string
  email: string
  name: string
  phone?: string
  status: string
  updatedAt: Date
}

export class UpdateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(request: UpdateUserRequest): Promise<UpdateUserResponse> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    if (!request.userId) {
      throw new Error('User ID is required')
    }

    // =====================================================================
    // 2. 獲取用戶
    // =====================================================================
    const user = await this.userRepository.findById(request.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // =====================================================================
    // 3. 構建更新資料
    // =====================================================================
    const updateInput: UpdateUserInput = {}

    // 驗證並設定名稱
    if (request.name !== undefined) {
      if (!request.name || request.name.length < 2 || request.name.length > 255) {
        throw new Error('Name must be between 2 and 255 characters')
      }
      updateInput.name = request.name
    }

    // 驗證並設定電子郵件
    if (request.email !== undefined && request.email !== user.email) {
      if (!UserDomainService.isValidEmail(request.email)) {
        throw new Error('Invalid email format')
      }
      // 檢查新電子郵件是否已被使用
      const existingUser = await this.userRepository.findByEmail(request.email)
      if (existingUser && existingUser.id !== user.id) {
        throw new Error(`Email ${request.email} is already in use`)
      }
      updateInput.email = request.email
    }

    // 驗證並設定電話
    if (request.phone !== undefined && request.phone !== user.phone) {
      if (request.phone && !UserDomainService.isValidPhone(request.phone)) {
        throw new Error('Invalid phone format')
      }
      const existingUser = await this.userRepository.findByPhone(request.phone)
      if (existingUser && existingUser.id !== user.id) {
        throw new Error(`Phone ${request.phone} is already in use`)
      }
      updateInput.phone = request.phone
    }

    // =====================================================================
    // 4. 更新用戶
    // =====================================================================
    const updatedUser = await this.userRepository.update(request.userId, updateInput)
    if (!updatedUser) {
      throw new Error('Failed to update user')
    }

    // =====================================================================
    // 5. 返回結果
    // =====================================================================
    return this.toResponse(updatedUser)
  }

  /**
   * 轉換為回應格式
   */
  private toResponse(user: User): UpdateUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      status: user.status,
      updatedAt: user.updatedAt,
    }
  }
}

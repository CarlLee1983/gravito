/**
 * RegisterUser Use Case
 *
 * 應用層業務邏輯：用戶註冊
 */

import { UserCreated } from '@domain/user/events/UserCreated'
import type { CreateUserInput, User } from '@domain/user/User'
import { UserDomainService } from '@domain/user/User'
import type { EventManager } from '@gravito/core'
import type { UserRepository } from '@infrastructure/repositories/UserRepository'
import * as bcrypt from 'bcrypt'

export interface RegisterUserRequest {
  email: string
  name: string
  password: string
  phone?: string
}

export interface RegisterUserResponse {
  id: string
  email: string
  name: string
  role: string
  createdAt: Date
}

export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private eventManager: EventManager
  ) {}

  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    this.validateInput(request)

    // =====================================================================
    // 2. 檢查用戶是否已存在
    // =====================================================================
    const existingUser = await this.userRepository.findByEmail(request.email)
    if (existingUser) {
      throw new Error(`Email ${request.email} is already registered`)
    }

    if (request.phone) {
      const existingPhone = await this.userRepository.findByPhone(request.phone)
      if (existingPhone) {
        throw new Error(`Phone ${request.phone} is already registered`)
      }
    }

    // =====================================================================
    // 3. 雜湊密碼
    // =====================================================================
    const hashedPassword = await this.hashPassword(request.password)

    // =====================================================================
    // 4. 創建新用戶
    // =====================================================================
    const createUserInput: CreateUserInput = {
      email: request.email,
      name: request.name,
      phone: request.phone,
      password: hashedPassword,
      role: 'customer', // 默認為客戶角色
    }

    const user = await this.userRepository.create(createUserInput)

    // =====================================================================
    // 5. 發送用戶建立事件
    // =====================================================================
    await this.eventManager.dispatch(
      new UserCreated({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      })
    )

    // =====================================================================
    // 6. 返回結果
    // =====================================================================
    return this.toResponse(user)
  }

  /**
   * 驗證輸入資料
   */
  private validateInput(request: RegisterUserRequest): void {
    // 驗證電子郵件
    if (!UserDomainService.isValidEmail(request.email)) {
      throw new Error('Invalid email format')
    }

    // 驗證密碼強度
    if (!UserDomainService.isStrongPassword(request.password)) {
      throw new Error(
        'Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters'
      )
    }

    // 驗證名稱
    if (!request.name || request.name.length < 2 || request.name.length > 255) {
      throw new Error('Name must be between 2 and 255 characters')
    }

    // 驗證電話（如果提供）
    if (request.phone && !UserDomainService.isValidPhone(request.phone)) {
      throw new Error('Invalid phone format')
    }
  }

  /**
   * 雜湊密碼
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10
    return bcrypt.hash(password, saltRounds)
  }

  /**
   * 轉換為回應格式
   */
  private toResponse(user: User): RegisterUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    }
  }
}

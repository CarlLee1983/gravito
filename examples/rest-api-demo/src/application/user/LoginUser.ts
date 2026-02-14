/**
 * LoginUser Use Case
 *
 * 應用層業務邏輯：用戶登入
 */

import type { User } from '@domain/user/User'
import { UserDomainService } from '@domain/user/User'
import type { UserRepository } from '@infrastructure/repositories/UserRepository'
import * as bcrypt from 'bcrypt'

export interface LoginUserRequest {
  email: string
  password: string
}

export interface LoginUserResponse {
  id: string
  email: string
  name: string
  role: string
  status: string
  token?: string // JWT token（由表現層生成）
}

export class LoginUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(request: LoginUserRequest): Promise<LoginUserResponse> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    this.validateInput(request)

    // =====================================================================
    // 2. 查找用戶
    // =====================================================================
    const user = await this.userRepository.findByEmail(request.email)
    if (!user) {
      throw new Error('Invalid email or password')
    }

    // =====================================================================
    // 3. 驗證用戶狀態
    // =====================================================================
    if (!UserDomainService.isActive(user)) {
      throw new Error('User account is not active')
    }

    // =====================================================================
    // 4. 驗證密碼
    // =====================================================================
    const passwordMatch = await bcrypt.compare(request.password, user.password)
    if (!passwordMatch) {
      throw new Error('Invalid email or password')
    }

    // =====================================================================
    // 5. 更新最後登入時間
    // =====================================================================
    await this.userRepository.updateLastLoginAt(user.id)

    // =====================================================================
    // 6. 返回結果
    // =====================================================================
    return this.toResponse(user)
  }

  /**
   * 驗證輸入資料
   */
  private validateInput(request: LoginUserRequest): void {
    if (!request.email || !request.password) {
      throw new Error('Email and password are required')
    }
  }

  /**
   * 轉換為回應格式
   */
  private toResponse(user: User): LoginUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    }
  }
}

/**
 * GetUserProfile Use Case
 *
 * 應用層業務邏輯：獲取用戶資料
 */

import type { UserProfile } from '@domain/user/User'
import { UserDomainService } from '@domain/user/User'
import type { OrderRepository } from '@infrastructure/repositories/OrderRepository'
import type { UserRepository } from '@infrastructure/repositories/UserRepository'

export interface GetUserProfileRequest {
  userId: string
}

export class GetUserProfileUseCase {
  constructor(
    private userRepository: UserRepository,
    private orderRepository: OrderRepository
  ) {}

  async execute(request: GetUserProfileRequest): Promise<UserProfile> {
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
    // 3. 驗證用戶狀態
    // =====================================================================
    if (!UserDomainService.isActive(user)) {
      throw new Error('User account is not active')
    }

    // =====================================================================
    // 4. 獲取用戶統計資訊
    // =====================================================================
    const orderCount = await this.orderRepository.getUserOrderCount(request.userId)
    const totalSpent = await this.orderRepository.getUserTotalSpent(request.userId)

    // =====================================================================
    // 5. 構建用戶資料
    // =====================================================================
    const { password: _, ...userWithoutPassword } = user
    const profile: UserProfile = {
      ...userWithoutPassword,
      orderCount,
      totalSpent,
    }

    // =====================================================================
    // 6. 返回結果
    // =====================================================================
    return profile
  }
}

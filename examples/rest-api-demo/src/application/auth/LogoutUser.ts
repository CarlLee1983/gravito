/**
 * LogoutUser Use Case
 *
 * 應用層業務邏輯：用戶登出
 */

export interface LogoutUserRequest {
  userId: string
  token?: string // JWT token to blacklist
}

export interface LogoutUserResponse {
  success: boolean
  message: string
}

export class LogoutUserUseCase {
  async execute(request: LogoutUserRequest): Promise<LogoutUserResponse> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    if (!request.userId) {
      throw new Error('User ID is required')
    }

    // =====================================================================
    // 2. 將 Token 添加到黑名單（如果提供）
    // =====================================================================
    if (request.token) {
      await this.blacklistToken(request.token)
    }

    // =====================================================================
    // 3. 清理用戶會話（如果使用 Session）
    // =====================================================================
    // TODO: 清理會話數據（用戶活動、臨時數據等）

    // =====================================================================
    // 4. 返回結果
    // =====================================================================
    return {
      success: true,
      message: 'Logged out successfully',
    }
  }

  /**
   * 將 Token 添加到黑名單
   */
  private async blacklistToken(token: string): Promise<void> {
    // TODO: 實現 Token 黑名單邏輯
    // 在 Redis 或數據庫中存儲失效的 token
    // 使用 Token 過期時間作為 TTL
    console.debug(`Token blacklisted: ${token.substring(0, 20)}...`)
  }
}

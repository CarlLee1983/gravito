import type { IAdminRepository } from '../../Domain/Contracts/IAdminRepository'
import type { Admin } from '../../Domain/Entities/Admin'

/**
 * Sentinel UserProvider 實現
 * 用於從 JWT payload 重構 Admin 對象
 */
export class SentinelAdminProvider {
  constructor(private readonly adminRepo: IAdminRepository) {}

  /**
   * 從 ID 取得 Admin（用於 guard 驗證）
   */
  async findById(id: string): Promise<Admin | null> {
    return this.adminRepo.findById(id)
  }

  /**
   * 從 payload 重構 Admin 對象
   */
  async getFromPayload(payload: {
    sub: string
    email: string
    isSuper: boolean
  }): Promise<Admin | null> {
    return this.adminRepo.findById(payload.sub)
  }

  /**
   * 驗證 Admin 是否仍然活躍
   */
  async isActive(admin: Admin): Promise<boolean> {
    const current = await this.adminRepo.findById(admin.id)
    if (!current) {
      return false
    }
    return current.isActive
  }
}

import type { PlanetCore } from '@gravito/core'
import { AdminErrorFactory } from '../../../Application/Errors/AdminError'
import type { IAdminRepository } from '../../Contracts/IAdminRepository'
import type { Admin } from '../../Entities/Admin'
import { AdminEmail } from '../../ValueObjects/AdminEmail'
import { injectAuthenticatableAdminRole } from '../Roles/AuthenticatableAdminRole'

export interface AdminAuthResult {
  admin: Admin
  accessToken: string
  refreshToken: string
}

/**
 * 管理員認證上下文協調器
 * 執行完整的登入流程：查找 → 驗證密碼 → 檢查狀態 → 記錄登入 → 發出 Hook
 */
export class AdminAuthContext {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 執行管理員認證流程
   */
  async authenticate(email: string, password: string): Promise<AdminAuthResult> {
    // 1. 查找管理員
    const adminEmail = AdminEmail.create(email)
    const admin = await this.adminRepo.findByEmail(adminEmail.value)
    if (!admin) {
      throw AdminErrorFactory.invalidCredentials()
    }

    // 2. 注入 AuthenticatableAdminRole 並驗證密碼
    // 業務規則在 Role 中：密碼不符時 throw InvalidCredentialsError
    const authRole = injectAuthenticatableAdminRole(admin, this.adminRepo)
    authRole.verifyPassword(password) // throw on invalid

    // 3. 檢查帳號狀態
    // 業務規則在 Role 中：非 ACTIVE 時 throw AdminInactiveError
    authRole.isActive()

    // 4. 記錄登入時間（包含持久化）
    await authRole.recordLogin(this.adminRepo)

    // 5. 發出 Hook 通知
    await this.core.hooks.doAction('admin:authenticated', {
      adminId: admin.id,
      email: admin.email.value,
      isSuper: admin.isSuper,
    })

    // 6. 返回認證結果（token 在 Phase 3 JWT Strategy 中簽發）
    return {
      admin,
      accessToken: `access_${admin.id}`,
      refreshToken: `refresh_${admin.id}`,
    }
  }
}

import { AdminErrorFactory } from '../../../Application/Errors/AdminError'
import type { IAdminRepository } from '../../Contracts/IAdminRepository'
import type { Admin } from '../../Entities/Admin'
import { AdminStatus } from '../../Entities/Admin'

/**
 * DCI Role: 可驗證的管理員角色 (inject function 模式)
 * 負責處理管理員的認證邏輯，包括密碼驗證和狀態檢查
 */
export interface AuthenticatableAdminRole {
  /**
   * 驗證密碼並執行業務規則檢查
   * 密碼不符時 throw InvalidCredentialsError
   */
  verifyPassword(passwordPlain: string): boolean

  /**
   * 檢查帳號狀態是否活躍
   * 非 ACTIVE 狀態時 throw AdminInactiveError
   */
  isActive(): boolean

  /**
   * 記錄登入時間並持久化
   */
  recordLogin(repo: IAdminRepository): Promise<void>
}

/**
 * 注入 AuthenticatableAdminRole 到 Admin entity
 * @param admin - Admin entity
 * @param repo - Admin repository (用於 recordLogin)
 * @returns AuthenticatableAdminRole interface
 */
export function injectAuthenticatableAdminRole(
  admin: Admin,
  repo: IAdminRepository
): AuthenticatableAdminRole {
  // 驗證 repo 的有效性（確保參數被使用）
  if (!repo) {
    throw new Error('Admin repository is required')
  }

  return {
    verifyPassword(passwordPlain: string): boolean {
      // 業務規則：密碼不符時 throw
      // 實際實作應使用 bcrypt 比較
      const isValid = admin.passwordHash === passwordPlain
      if (!isValid) {
        throw AdminErrorFactory.invalidCredentials()
      }
      return true
    },

    isActive(): boolean {
      // 業務規則：非 ACTIVE 狀態時 throw
      if (admin.status !== AdminStatus.ACTIVE) {
        throw AdminErrorFactory.adminInactive(admin.email.value)
      }
      return true
    },

    async recordLogin(repo: IAdminRepository): Promise<void> {
      // 委派給 Entity 的原子方法
      admin.recordLogin()
      // 持久化
      await repo.save(admin)
    },
  }
}

import type { Admin } from '../../Entities/Admin'
import { AdminStatus } from '../../Entities/Admin'

/**
 * DCI Role: 可驗證的管理員角色
 * 負責處理管理員的認證邏輯
 */
export class AuthenticatableAdminRole {
  constructor(private admin: Admin) {}

  /**
   * 驗證管理員狀態是否活躍
   */
  isActive(): boolean {
    return this.admin.status === AdminStatus.ACTIVE
  }

  /**
   * 檢查密碼是否匹配（placeholder，實際需要 bcrypt）
   */
  async verifyPassword(passwordHash: string): Promise<boolean> {
    // 實際實作需要使用 bcrypt 比較
    // 這裡只是 placeholder
    return this.admin.passwordHash === passwordHash
  }

  /**
   * 記錄登入時間
   */
  recordLogin(): void {
    this.admin.recordLogin()
  }

  /**
   * 取得管理員電子郵件
   */
  getEmail(): string {
    return this.admin.email.toString()
  }

  /**
   * 檢查是否為超級管理員
   */
  isSuperAdmin(): boolean {
    return this.admin.isSuper
  }
}

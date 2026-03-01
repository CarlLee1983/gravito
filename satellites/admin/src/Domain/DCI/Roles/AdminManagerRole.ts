import type { Admin } from '../../Entities/Admin'

/**
 * DCI Role: 管理員管理者角色
 * 負責管理員的CRUD操作權限檢查
 */
export class AdminManagerRole {
  constructor(private requestingAdmin: Admin) {}

  /**
   * 檢查是否可以管理其他管理員
   */
  canManage(): boolean {
    return this.requestingAdmin.isSuper
  }

  /**
   * 檢查是否可以建立管理員
   */
  canCreate(): boolean {
    return this.requestingAdmin.isSuper
  }

  /**
   * 檢查是否可以刪除指定管理員
   */
  canDelete(targetAdmin: Admin): boolean {
    if (!this.requestingAdmin.isSuper) {
      return false
    }
    // 不能刪除超級管理員
    return !targetAdmin.isSuper
  }

  /**
   * 檢查是否可以停用指定管理員
   */
  canSuspend(targetAdmin: Admin): boolean {
    if (!this.requestingAdmin.isSuper) {
      return false
    }
    // 不能停用超級管理員
    return !targetAdmin.isSuper
  }

  /**
   * 檢查是否可以更新指定管理員
   */
  canUpdate(targetAdmin: Admin): boolean {
    if (this.requestingAdmin.isSuper) {
      return true
    }
    // 非超級管理員只能更新自己
    return this.requestingAdmin.id === targetAdmin.id
  }
}

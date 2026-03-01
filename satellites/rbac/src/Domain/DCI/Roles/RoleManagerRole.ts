import type { Role } from '../../Entities/Role'

/**
 * DCI Role: 角色管理者角色
 * 負責角色的 CRUD 操作權限檢查
 */
export class RoleManagerRole {
  constructor(private requestingAdmin: { isSuper: boolean }) {}

  /**
   * 檢查是否可以建立角色
   */
  canCreate(): boolean {
    return this.requestingAdmin.isSuper
  }

  /**
   * 檢查是否可以更新指定角色
   */
  canUpdate(role: Role): boolean {
    if (!this.requestingAdmin.isSuper) {
      return false
    }
    // 系統角色通常受到保護，可視業務需求調整
    return !role.isSystem
  }

  /**
   * 檢查是否可以刪除指定角色
   */
  canDelete(role: Role): boolean {
    if (!this.requestingAdmin.isSuper) {
      return false
    }
    // 系統角色不能刪除
    return !role.isSystem
  }

  /**
   * 檢查是否可以管理角色的權限
   */
  canManagePermissions(): boolean {
    return this.requestingAdmin.isSuper
  }

  /**
   * 檢查是否可以查看角色詳情
   */
  canView(): boolean {
    // 所有人都可以查看角色（在授權中間件層面可再限制）
    return true
  }
}

import type { Role } from '../../Entities/Role'

/**
 * DCI Role: Admin 在角色管理場景中的角色
 *
 * 定義了 Admin 在 RoleManagementContext 中應該負責的事項：
 * 1. 驗證自己是否有權進行各種操作
 * 2. 提供在此上下文中執行操作所需的邏輯
 *
 * 這是一個真正的 DCI Role，而非純決策檢查器：
 * - 代表 Admin 在特定場景中的職責
 * - 可以封裝複雜的驗證邏輯
 * - 支持未來的業務規則擴展
 */
export class AdminAsRoleManagerRole {
  constructor(private admin: { isSuper: boolean }) {}

  /**
   * 驗證 Admin 是否可以建立角色
   * 責任：檢查權限前置條件
   */
  assertCanCreateRole(): void {
    if (!this.admin.isSuper) {
      throw new Error('Only super admin can create roles')
    }
  }

  /**
   * 驗證 Admin 是否可以更新指定角色
   * 責任：檢查權限和業務規則（系統角色不能更新）
   */
  assertCanUpdateRole(role: Role): void {
    if (!this.admin.isSuper) {
      throw new Error('Only super admin can update roles')
    }
    if (role.isSystem) {
      throw new Error('Cannot update system role')
    }
  }

  /**
   * 驗證 Admin 是否可以刪除指定角色
   * 責任：檢查權限和業務規則（系統角色不能刪除）
   */
  assertCanDeleteRole(role: Role): void {
    if (!this.admin.isSuper) {
      throw new Error('Only super admin can delete roles')
    }
    if (role.isSystem) {
      throw new Error('Cannot delete system role')
    }
  }

  /**
   * 可選：未來可以添加更複雜的操作邏輯
   * 例如：
   * - 驗證角色名稱是否衝突
   * - 檢查是否有相依性
   * - 執行前後的清理操作
   */
}

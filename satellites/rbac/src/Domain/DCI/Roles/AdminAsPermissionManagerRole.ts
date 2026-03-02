/**
 * DCI Role: Admin 在權限管理場景中的角色
 *
 * 定義了 Admin 在 PermissionManagementContext 中應該負責的事項：
 * 1. 驗證自己是否有權進行權限管理操作
 * 2. 提供權限管理所需的驗證邏輯
 *
 * 這個 Role 使 Admin 在權限管理場景中扮演「管理者」的角色。
 */
export class AdminAsPermissionManagerRole {
  constructor(private admin: { isSuper: boolean }) {}

  /**
   * 驗證 Admin 是否可以註冊新權限
   * 責任：檢查權限前置條件
   */
  assertCanRegisterPermission(): void {
    if (!this.admin.isSuper) {
      throw new Error('Only super admin can register permissions')
    }
  }

  /**
   * 驗證 Admin 是否可以修改權限
   * 責任：檢查權限和業務規則（系統權限可能受保護）
   */
  assertCanModifyPermission(isSystemPermission: boolean): void {
    if (!this.admin.isSuper) {
      throw new Error('Only super admin can modify permissions')
    }
    if (isSystemPermission) {
      throw new Error('Cannot modify system permission')
    }
  }

  /**
   * 驗證 Admin 是否可以刪除權限
   * 責任：檢查權限和業務規則
   */
  assertCanDeletePermission(isSystemPermission: boolean): void {
    if (!this.admin.isSuper) {
      throw new Error('Only super admin can delete permissions')
    }
    if (isSystemPermission) {
      throw new Error('Cannot delete system permission')
    }
  }
}

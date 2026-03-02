import type { Role } from '../../Entities/Role'

/**
 * DCI Role: Role 在授權檢查場景中的角色
 *
 * 定義了 Role 在 AuthorizationContext 中應該負責的事項：
 * 1. 提供自己包含的權限列表
 * 2. 檢查自己是否包含特定權限
 *
 * 這個 Role 使 Role Entity 在授權檢查場景中扮演「權限容器」的角色，
 * 提供統一的介面來查詢權限，而不是直接訪問 Entity 的內部屬性。
 */
export class RoleAsPermissionContainerRole {
  constructor(private role: Role) {}

  /**
   * 責任：提供自己包含的所有權限 ID
   */
  getPermissionIds(): string[] {
    return this.role.permissionIds
  }

  /**
   * 責任：檢查自己是否包含指定的權限
   */
  containsPermission(permissionId: string): boolean {
    return this.role.permissionIds.includes(permissionId)
  }

  /**
   * 責任：檢查自己是否是系統角色
   * 系統角色有特殊的保護規則
   */
  isSystemRole(): boolean {
    return this.role.isSystem
  }

  /**
   * 責任：獲取角色的基本信息
   * 用於授權檢查的日誌和追蹤
   */
  getInfo(): { id: string; name: string; permissionCount: number } {
    return {
      id: this.role.id,
      name: this.role.name,
      permissionCount: this.role.permissionIds.length,
    }
  }
}

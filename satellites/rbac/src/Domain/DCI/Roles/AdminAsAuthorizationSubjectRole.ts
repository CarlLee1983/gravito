import type { IPermissionRepository } from '../../Contracts/IPermissionRepository'
import type { IRoleRepository } from '../../Contracts/IRoleRepository'
import type { PermissionKey } from '../../ValueObjects/PermissionKey'

/**
 * DCI Role: Admin 在授權檢查場景中的角色
 *
 * 定義了 Admin 在 AuthorizationContext 中應該負責的事項：
 * 1. 查詢自己擁有的角色
 * 2. 檢查自己是否擁有特定權限
 * 3. 支持超級管理員的特殊處理
 *
 * 這個 Role 封裝了與授權相關的所有邏輯，
 * 使 Admin 可以在授權檢查場景中扮演「被檢查者」的角色。
 */
export class AdminAsAuthorizationSubjectRole {
  constructor(
    private admin: { id: string; isSuper: boolean },
    private roleRepo: IRoleRepository,
    private permissionRepo: IPermissionRepository
  ) {}

  /**
   * 超級管理員無條件通過所有權限檢查
   */
  isSuperAdmin(): boolean {
    return this.admin.isSuper
  }

  /**
   * 責任：查詢自己擁有的所有角色
   * 這是 Admin 在授權檢查中的核心責任
   */
  async getRoleIds(): Promise<string[]> {
    return (this.roleRepo as any).getAdminRoleIds(this.admin.id)
  }

  /**
   * 責任：查詢自己通過所有角色擁有的權限
   */
  async getAllPermissions(): Promise<Array<{ id: string; key: string }>> {
    const roleIds = await this.getRoleIds()
    if (roleIds.length === 0) {
      return []
    }

    let allPermissions: Array<{ id: string; key: string }> = []

    for (const roleId of roleIds) {
      const role = await this.roleRepo.findById(roleId)
      if (!role) {
        continue
      }

      const permissionIds = role.permissionIds
      if (permissionIds.length > 0) {
        const perms = await this.permissionRepo.findByIds?.(permissionIds)
        if (perms) {
          allPermissions = allPermissions.concat(perms.map((p) => ({ id: p.id, key: p.key.value })))
        }
      }
    }

    return allPermissions
  }

  /**
   * 責任：檢查自己是否擁有指定的權限
   * 支持萬用字元匹配（例如 "products:*" 匹配所有 products 操作）
   */
  async hasPermission(permissionKey: PermissionKey): Promise<boolean> {
    // 快速路徑：超級管理員無條件通過
    if (this.admin.isSuper) {
      return true
    }

    const permissions = await this.getAllPermissions()

    // 檢查是否有匹配的權限
    for (const perm of permissions) {
      if (permissionKey.matchesPattern(perm.key)) {
        return true
      }
    }

    return false
  }
}

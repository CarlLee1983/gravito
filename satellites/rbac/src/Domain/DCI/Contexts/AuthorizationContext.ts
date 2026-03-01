import type { IPermissionRepository } from '../../Contracts/IPermissionRepository'
import type { IRoleRepository } from '../../Contracts/IRoleRepository'
import type { PermissionKey } from '../../ValueObjects/PermissionKey'

export interface AdminForAuth {
  id: string
  isSuper: boolean
}

/**
 * 授權上下文協調器
 * 檢查管理員是否擁有特定權限
 */
export class AuthorizationContext {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly permissionRepo: IPermissionRepository
  ) {}

  /**
   * 檢查管理員是否擁有特定權限
   * 支援萬用字元匹配：group:*, group:action:*
   */
  async checkAdminPermission(admin: AdminForAuth, permissionKey: PermissionKey): Promise<boolean> {
    // 快速路徑：超級管理員無條件通過
    if (admin.isSuper) {
      return true
    }

    // 1. 查詢管理員的角色
    const roleIds = await (this.roleRepo as any).getAdminRoleIds(admin.id)
    if (roleIds.length === 0) {
      return false
    }

    // 2. 查詢這些角色擁有的權限
    let allPermissions: Array<{ id: string; key: string }> = []

    for (const roleId of roleIds) {
      const role = await this.roleRepo.findById(roleId)
      if (!role) {
        continue
      }

      // 取得該角色的權限 ID
      const permissionIds = role.permissionIds
      if (permissionIds.length > 0) {
        const perms = await this.permissionRepo.findByIds?.(permissionIds)
        if (perms) {
          allPermissions = allPermissions.concat(perms.map((p) => ({ id: p.id, key: p.key.value })))
        }
      }
    }

    // 3. 檢查是否符合所求的權限（支援萬用字元）
    for (const perm of allPermissions) {
      if (permissionKey.matchesPattern(perm.key)) {
        return true
      }
    }

    return false
  }
}

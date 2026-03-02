import type { PlanetCore } from '@gravito/core'
import { RbacErrorFactory } from '../../../Application/Errors/RbacError'
import type { IRoleRepository } from '../../Contracts/IRoleRepository'
import { Role } from '../../Entities/Role'
import { AdminAsRoleManagerRole } from '../Roles/RoleManagerRole'

export interface RequestingAdmin {
  isSuper: boolean
}

/**
 * DCI Context: 角色管理場景
 *
 * 職責：協調角色的 CRUD 操作
 * 交互流程：
 * 1. RequestingAdmin 扮演 AdminAsRoleManagerRole
 * 2. Role 接受 CRUD 操作
 * 3. Context 協調整個流程
 */
export class RoleManagementContext {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 建立角色
   * 交互：Admin 作為 RoleManager 驗證權限，Context 執行建立
   */
  async createRole(
    name: string,
    displayName: string,
    description: string | undefined,
    requestingAdmin: RequestingAdmin
  ): Promise<Role> {
    // Admin 扮演 RoleManager 角色，驗證自己的責任
    const roleManager = new AdminAsRoleManagerRole(requestingAdmin)
    try {
      roleManager.assertCanCreateRole()
    } catch (error) {
      throw RbacErrorFactory.permissionDenied(
        error instanceof Error ? error.message : 'Only super admin can create roles'
      )
    }

    // 檢查重複
    const exists = await this.roleRepo.exists(name)
    if (exists) {
      throw RbacErrorFactory.roleExists(name)
    }

    // 建立角色
    const id = crypto.randomUUID()
    const role = Role.create(id, {
      name,
      displayName,
      description,
      isSystem: false,
    })

    // 持久化
    await this.roleRepo.save(role)

    // 發出 Hook
    await this.core.hooks.doAction('rbac:role-created', {
      roleId: role.id,
      name: role.name,
    })

    return role
  }

  /**
   * 更新角色
   * 交互：Admin 作為 RoleManager 驗證權限，Context 執行更新
   */
  async updateRole(
    roleId: string,
    displayName: string,
    description?: string,
    requestingAdmin?: RequestingAdmin
  ): Promise<Role> {
    // 取得角色
    const role = await this.roleRepo.findById(roleId)
    if (!role) {
      throw RbacErrorFactory.roleNotFound(roleId)
    }

    // 檢查權限
    if (requestingAdmin) {
      const roleManager = new AdminAsRoleManagerRole(requestingAdmin)
      try {
        roleManager.assertCanUpdateRole(role)
      } catch (error) {
        throw RbacErrorFactory.permissionDenied(
          error instanceof Error ? error.message : 'Cannot update system role'
        )
      }
    }

    // 更新
    role.setDisplayName(displayName)
    if (description !== undefined) {
      role.setDescription(description)
    }
    await this.roleRepo.save(role)

    return role
  }

  /**
   * 刪除角色
   * 交互：Admin 作為 RoleManager 驗證權限，Context 執行刪除
   */
  async deleteRole(roleId: string, requestingAdmin: RequestingAdmin): Promise<void> {
    // 取得角色
    const role = await this.roleRepo.findById(roleId)
    if (!role) {
      throw RbacErrorFactory.roleNotFound(roleId)
    }

    // Admin 扮演 RoleManager 角色，驗證自己的責任
    const roleManager = new AdminAsRoleManagerRole(requestingAdmin)
    try {
      roleManager.assertCanDeleteRole(role)
    } catch (error) {
      throw RbacErrorFactory.permissionDenied(
        error instanceof Error ? error.message : 'Cannot delete system role'
      )
    }

    // 刪除
    await this.roleRepo.delete(roleId)

    // 發出 Hook
    await this.core.hooks.doAction('rbac:role-deleted', {
      roleId: role.id,
      name: role.name,
    })
  }
}

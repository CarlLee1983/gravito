import type { PlanetCore } from '@gravito/core'
import { RbacErrorFactory } from '../../../Application/Errors/RbacError'
import type { IRoleRepository } from '../../Contracts/IRoleRepository'
import { Role } from '../../Entities/Role'
import { RoleManagerRole } from '../Roles/RoleManagerRole'

export interface RequestingAdmin {
  isSuper: boolean
}

/**
 * 角色管理上下文協調器
 * 協調角色的 CRUD 操作
 */
export class RoleManagementContext {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 建立角色
   */
  async createRole(
    name: string,
    displayName: string,
    description: string | undefined,
    requestingAdmin: RequestingAdmin
  ): Promise<Role> {
    // 檢查權限
    const managerRole = new RoleManagerRole(requestingAdmin)
    if (!managerRole.canCreate()) {
      throw RbacErrorFactory.permissionDenied('Only super admin can create roles')
    }

    // 檢查重複
    const exists = await this.roleRepo.exists(name)
    if (exists) {
      throw RbacErrorFactory.roleExists(name)
    }

    // 建立角色
    const id = crypto.randomUUID()
    const role = Role.create(id, name, displayName, {
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
      const managerRole = new RoleManagerRole(requestingAdmin)
      if (!managerRole.canUpdate(role)) {
        throw RbacErrorFactory.permissionDenied('Cannot update system role')
      }
    }

    // 更新
    role.update(displayName, description)
    await this.roleRepo.save(role)

    return role
  }

  /**
   * 刪除角色
   */
  async deleteRole(roleId: string, requestingAdmin: RequestingAdmin): Promise<void> {
    // 取得角色
    const role = await this.roleRepo.findById(roleId)
    if (!role) {
      throw RbacErrorFactory.roleNotFound(roleId)
    }

    // 檢查權限
    const managerRole = new RoleManagerRole(requestingAdmin)
    if (!managerRole.canDelete(role)) {
      throw RbacErrorFactory.permissionDenied('Cannot delete system role')
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

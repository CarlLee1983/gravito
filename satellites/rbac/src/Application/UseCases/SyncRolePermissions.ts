import type { IRoleRepository } from '../../Domain/Contracts/IRoleRepository'
import { RoleMapper } from '../DTOs/RoleDTO'
import { RbacErrorFactory } from '../Errors/RbacError'

export class SyncRolePermissionsUseCase {
  constructor(private readonly roleRepo: IRoleRepository) {}

  async execute(roleId: string, permissionIds: string[]) {
    const role = await this.roleRepo.findById(roleId)
    if (!role) {
      throw RbacErrorFactory.roleNotFound(roleId)
    }

    role.setPermissionIds(permissionIds)
    await this.roleRepo.save(role)

    return RoleMapper.toDTO(role)
  }
}

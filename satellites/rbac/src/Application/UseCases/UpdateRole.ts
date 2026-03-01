import type { PlanetCore } from '@gravito/core'
import type { IRoleRepository } from '../../Domain/Contracts/IRoleRepository'
import { RoleManagementContext } from '../../Domain/DCI/Contexts/RoleManagementContext'
import { RoleMapper } from '../DTOs/RoleDTO'
import type { RequestingAdmin } from './CreateRole'

export class UpdateRoleUseCase {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly core: PlanetCore
  ) {}

  async execute(
    id: string,
    displayName: string,
    description?: string,
    requestingAdmin?: RequestingAdmin
  ) {
    const context = new RoleManagementContext(this.roleRepo, this.core)
    const role = await context.updateRole(id, displayName, description, requestingAdmin)

    return RoleMapper.toDTO(role)
  }
}

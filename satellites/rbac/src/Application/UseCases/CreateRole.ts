import type { PlanetCore } from '@gravito/core'
import type { IRoleRepository } from '../../Domain/Contracts/IRoleRepository'
import { RoleManagementContext } from '../../Domain/DCI/Contexts/RoleManagementContext'
import { RoleMapper } from '../DTOs/RoleDTO'

export interface RequestingAdmin {
  isSuper: boolean
}

export class CreateRoleUseCase {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly core: PlanetCore
  ) {}

  async execute(
    name: string,
    displayName: string,
    description: string | undefined,
    requestingAdmin: RequestingAdmin
  ) {
    const context = new RoleManagementContext(this.roleRepo, this.core)
    const role = await context.createRole(name, displayName, description, requestingAdmin)

    return RoleMapper.toDTO(role)
  }
}

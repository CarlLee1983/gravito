import type { PlanetCore } from '@gravito/core'
import type { IRoleRepository } from '../../Domain/Contracts/IRoleRepository'
import { RoleManagementContext } from '../../Domain/DCI/Contexts/RoleManagementContext'
import type { RequestingAdmin } from './CreateRole'

export class DeleteRoleUseCase {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly core: PlanetCore
  ) {}

  async execute(id: string, requestingAdmin: RequestingAdmin): Promise<void> {
    const context = new RoleManagementContext(this.roleRepo, this.core)
    await context.deleteRole(id, requestingAdmin)
  }
}

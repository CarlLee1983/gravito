import type { PlanetCore } from '@gravito/core'
import type { IAdminRepository } from '../../Domain/Contracts/IAdminRepository'
import { AdminManagementContext } from '../../Domain/DCI/Contexts/AdminManagementContext'
import type { Admin } from '../../Domain/Entities/Admin'

export class DeleteAdminUseCase {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly core: PlanetCore
  ) {}

  async execute(id: string, requestingAdmin: Admin): Promise<void> {
    const context = new AdminManagementContext(this.adminRepo, this.core)
    await context.deleteAdmin(id, requestingAdmin)
  }
}

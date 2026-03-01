import type { PlanetCore } from '@gravito/core'
import type { IAdminRepository } from '../../Domain/Contracts/IAdminRepository'
import { AdminManagementContext } from '../../Domain/DCI/Contexts/AdminManagementContext'
import { AdminMapper } from '../DTOs/AdminDTO'

export class UpdateAdminUseCase {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly core: PlanetCore
  ) {}

  async execute(id: string, name: string, metadata?: Record<string, unknown>) {
    const context = new AdminManagementContext(this.adminRepo, this.core)
    const admin = await context.updateProfile(id, name, metadata)

    return AdminMapper.toDTO(admin)
  }
}

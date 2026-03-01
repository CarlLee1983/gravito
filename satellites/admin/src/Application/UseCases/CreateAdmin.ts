import type { PlanetCore } from '@gravito/core'
import type { IAdminRepository } from '../../Domain/Contracts/IAdminRepository'
import { AdminManagementContext } from '../../Domain/DCI/Contexts/AdminManagementContext'
import type { Admin } from '../../Domain/Entities/Admin'
import { AdminEmail } from '../../Domain/ValueObjects/AdminEmail'
import { AdminMapper } from '../DTOs/AdminDTO'

export class CreateAdminUseCase {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly core: PlanetCore
  ) {}

  async execute(
    email: string,
    name: string,
    password: string,
    requestingAdmin: Admin,
    options: { isSuper?: boolean } = {}
  ) {
    const emailVO = AdminEmail.create(email)
    const context = new AdminManagementContext(this.adminRepo, this.core)

    const admin = await context.createAdmin(
      emailVO,
      name,
      password, // 實際應 hash password
      requestingAdmin,
      options
    )

    return AdminMapper.toDTO(admin)
  }
}

import type { PlanetCore } from '@gravito/core'
import type { IAdminRepository } from '../../Domain/Contracts/IAdminRepository'
import { AdminAuthContext } from '../../Domain/DCI/Contexts/AdminAuthContext'
import type { JwtAdminAuthStrategy } from '../../Interface/Http/Strategies/JwtAdminAuthStrategy'
import { AdminAuthResponseMapper } from '../DTOs/AdminAuthResponseDTO'

export class LoginAdminUseCase {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly jwtStrategy: JwtAdminAuthStrategy,
    private readonly core: PlanetCore
  ) {}

  async execute(email: string, password: string) {
    const context = new AdminAuthContext(this.adminRepo, this.core)
    const admin = await context.authenticate(email, password)

    const tokens = this.jwtStrategy.issueCredentials(admin.admin)
    return AdminAuthResponseMapper.toDTO(admin.admin, tokens)
  }
}

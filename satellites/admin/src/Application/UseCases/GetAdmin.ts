import type { IAdminRepository } from '../../Domain/Contracts/IAdminRepository'
import { AdminMapper } from '../DTOs/AdminDTO'
import { AdminErrorFactory } from '../Errors/AdminError'

export class GetAdminUseCase {
  constructor(private readonly adminRepo: IAdminRepository) {}

  async execute(id: string) {
    const admin = await this.adminRepo.findById(id)
    if (!admin) {
      throw AdminErrorFactory.adminNotFound(id)
    }

    return AdminMapper.toDTO(admin)
  }
}

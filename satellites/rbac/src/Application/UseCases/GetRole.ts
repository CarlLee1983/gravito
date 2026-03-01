import type { IRoleRepository } from '../../Domain/Contracts/IRoleRepository'
import { RoleMapper } from '../DTOs/RoleDTO'
import { RbacErrorFactory } from '../Errors/RbacError'

export class GetRoleUseCase {
  constructor(private readonly roleRepo: IRoleRepository) {}

  async execute(id: string) {
    const role = await this.roleRepo.findById(id)
    if (!role) {
      throw RbacErrorFactory.roleNotFound(id)
    }

    return RoleMapper.toDTO(role)
  }
}

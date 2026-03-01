import type { IRoleRepository } from '../../Domain/Contracts/IRoleRepository'
import { RbacErrorFactory } from '../Errors/RbacError'

export class AssignRoleToAdminUseCase {
  constructor(private readonly roleRepo: IRoleRepository) {}

  async execute(adminId: string, roleId: string): Promise<void> {
    // 驗證 role 存在
    const role = await this.roleRepo.findById(roleId)
    if (!role) {
      throw RbacErrorFactory.roleNotFound(roleId)
    }

    // 指派角色
    await (this.roleRepo as any).assignRole(adminId, roleId)
  }
}

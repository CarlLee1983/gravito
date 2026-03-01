import type { IPermissionRepository } from '../../Domain/Contracts/IPermissionRepository'
import type { IRoleRepository } from '../../Domain/Contracts/IRoleRepository'
import { AuthorizationContext } from '../../Domain/DCI/Contexts/AuthorizationContext'
import { PermissionKey } from '../../Domain/ValueObjects/PermissionKey'

export interface AdminForPermissionCheck {
  id: string
  isSuper: boolean
}

export class CheckPermissionUseCase {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly permissionRepo: IPermissionRepository
  ) {}

  async execute(admin: AdminForPermissionCheck, permissionKey: string): Promise<boolean> {
    try {
      const key = PermissionKey.create(permissionKey)
      const context = new AuthorizationContext(this.roleRepo, this.permissionRepo)
      return await context.checkAdminPermission(admin, key)
    } catch {
      return false
    }
  }
}

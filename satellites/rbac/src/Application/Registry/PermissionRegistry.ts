import type { PlanetCore } from '@gravito/core'
import type {
  IPermissionRegistry,
  PermissionRegistryInput,
} from '../../Domain/Contracts/IPermissionRegistry'
import type { IPermissionRepository } from '../../Domain/Contracts/IPermissionRepository'
import { PermissionManagementContext } from '../../Domain/DCI/Contexts/PermissionManagementContext'
import { PermissionKey } from '../../Domain/ValueObjects/PermissionKey'

/**
 * 權限註冊系統
 * 提供動態且冪等的權限註冊能力
 */
export class PermissionRegistry implements IPermissionRegistry {
  private context: PermissionManagementContext

  constructor(
    private readonly permissionRepo: IPermissionRepository,
    private readonly core: PlanetCore
  ) {
    this.context = new PermissionManagementContext(permissionRepo, core)
  }

  /**
   * 註冊單一權限（冪等）
   */
  async register(input: PermissionRegistryInput): Promise<void> {
    await this.context.registerPermission(input.key, input.label, input.description)
  }

  /**
   * 批次註冊權限（冪等）
   */
  async registerMany(inputs: PermissionRegistryInput[]): Promise<void> {
    await this.context.registerMany(inputs)
  }

  /**
   * 取得所有已註冊的權限
   */
  async getAll(): Promise<Array<{ key: string; label: string }>> {
    const permissions = await this.permissionRepo.findAll()
    return permissions.map((p) => ({
      key: p.key.value,
      label: p.label,
    }))
  }
}

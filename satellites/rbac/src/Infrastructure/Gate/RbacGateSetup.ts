import type { PlanetCore } from '@gravito/core'
import type { IPermissionRepository } from '../../Domain/Contracts/IPermissionRepository'
import type { IRoleRepository } from '../../Domain/Contracts/IRoleRepository'
import { AuthorizationContext } from '../../Domain/DCI/Contexts/AuthorizationContext'
import { PermissionKey } from '../../Domain/ValueObjects/PermissionKey'

export interface AdminForGate {
  id: string
  isSuper: boolean
}

/**
 * RBAC Gate 設置
 * 與 Sentinel Gate 整合，提供動態權限檢查
 */
export class RbacGateSetup {
  private authContext: AuthorizationContext

  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly permissionRepo: IPermissionRepository,
    private readonly core: PlanetCore
  ) {
    this.authContext = new AuthorizationContext(roleRepo, permissionRepo)
  }

  /**
   * 配置 Sentinel Gate
   */
  setupGate(): void {
    // 取得 Sentinel Gate
    const gate = this.core.container.make('sentinel.gate')

    // 1. before hook - Super admin 快速通過
    gate?.before?.((admin: AdminForGate) => {
      if (admin?.isSuper) {
        return true
      }
    })

    // 2. 動態定義權限檢查
    gate?.define?.('*', async (admin: AdminForGate, permissionKey: string) => {
      try {
        const key = PermissionKey.create(permissionKey)
        return await this.authContext.checkAdminPermission(admin, key)
      } catch {
        return false
      }
    })
  }

  /**
   * 檢查管理員是否擁有特定權限
   */
  async checkPermission(admin: AdminForGate, permissionKey: string): Promise<boolean> {
    try {
      const key = PermissionKey.create(permissionKey)
      return await this.authContext.checkAdminPermission(admin, key)
    } catch {
      return false
    }
  }
}

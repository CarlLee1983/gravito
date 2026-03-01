import type { PlanetCore } from '@gravito/core'
import { RbacErrorFactory } from '../../../Application/Errors/RbacError'
import type { IPermissionRegistry } from '../../Contracts/IPermissionRegistry'
import type { IPermissionRepository } from '../../Contracts/IPermissionRepository'
import { Permission } from '../../Entities/Permission'
import { PermissionKey } from '../../ValueObjects/PermissionKey'

/**
 * 權限管理上下文協調器
 * 協調權限的註冊、初始化、同步等操作
 */
export class PermissionManagementContext {
  constructor(
    private readonly permissionRepo: IPermissionRepository,
    private readonly core: PlanetCore
  ) {}

  /**
   * 註冊單一權限（冪等：key 已存在則跳過）
   */
  async registerPermission(
    key: string,
    label: string,
    description?: string
  ): Promise<Permission | null> {
    try {
      const permissionKey = PermissionKey.create(key)

      // 檢查是否已存在
      const existing = await this.permissionRepo.findByKey(permissionKey)
      if (existing) {
        return null // 冪等：已存在則跳過
      }

      // 建立新權限
      const id = crypto.randomUUID()
      const permission = Permission.create(id, permissionKey, label, {
        description,
        isSystem: false,
      })

      // 持久化
      await this.permissionRepo.save(permission)

      // 發出 Hook
      await this.core.hooks.doAction('rbac:permission-registered', {
        permissionId: permission.id,
        key: permission.key.value,
      })

      return permission
    } catch (error) {
      if (error instanceof Error) {
        throw RbacErrorFactory.invalidPermissionKey(key)
      }
      throw error
    }
  }

  /**
   * 批次註冊權限（冪等）
   */
  async registerMany(
    inputs: Array<{ key: string; label: string; description?: string }>
  ): Promise<Permission[]> {
    const registered: Permission[] = []

    for (const input of inputs) {
      const permission = await this.registerPermission(input.key, input.label, input.description)
      if (permission) {
        registered.push(permission)
      }
    }

    return registered
  }

  /**
   * 種子化系統權限
   */
  async seedSystemPermissions(): Promise<void> {
    const systemPermissions = [
      { key: 'admin:read', label: '讀取管理員' },
      { key: 'admin:manage', label: '管理員管理' },
      { key: 'rbac:read', label: '讀取角色權限' },
      { key: 'rbac:manage', label: '角色權限管理' },
    ]

    for (const perm of systemPermissions) {
      const permissionKey = PermissionKey.create(perm.key)
      const existing = await this.permissionRepo.findByKey(permissionKey)

      if (!existing) {
        const id = crypto.randomUUID()
        const permission = Permission.create(id, permissionKey, perm.label, {
          isSystem: true,
        })
        await this.permissionRepo.save(permission)
      }
    }
  }
}

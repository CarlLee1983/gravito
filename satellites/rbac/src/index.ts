import type { ServiceProvider } from '@gravito/core'
import { PermissionRegistry } from './Application/Registry/PermissionRegistry'
import { AssignRoleToAdminUseCase } from './Application/UseCases/AssignRoleToAdmin'
import { CheckPermissionUseCase } from './Application/UseCases/CheckPermission'
import { CreateRoleUseCase } from './Application/UseCases/CreateRole'
import { DeleteRoleUseCase } from './Application/UseCases/DeleteRole'
import { GetRoleUseCase } from './Application/UseCases/GetRole'
import { ListPermissionsUseCase } from './Application/UseCases/ListPermissions'

// UseCases
import { ListRolesUseCase } from './Application/UseCases/ListRoles'
import { RevokeRoleFromAdminUseCase } from './Application/UseCases/RevokeRoleFromAdmin'
import { SyncRolePermissionsUseCase } from './Application/UseCases/SyncRolePermissions'
import { UpdateRoleUseCase } from './Application/UseCases/UpdateRole'
import { RbacGateSetup } from './Infrastructure/Gate/RbacGateSetup'
import { InMemoryPermissionRepository } from './Infrastructure/Persistence/AtlasPermissionRepository'
import { InMemoryRoleRepository } from './Infrastructure/Persistence/AtlasRoleRepository'
import { PermissionController } from './Interface/Http/Controllers/PermissionController'
// Controllers
import { RoleController } from './Interface/Http/Controllers/RoleController'
import { requirePermission } from './Interface/Http/Middleware/requirePermission'

/**
 * RBAC Service Provider
 * 角色與權限管理系統服務提供者
 */
export class RbacServiceProvider implements ServiceProvider {
  constructor(private readonly core: any) {}

  register(): void {
    // Repositories
    this.core.container.singleton('rbac.roleRepository', () => {
      return new InMemoryRoleRepository()
    })

    this.core.container.singleton('rbac.permissionRepository', () => {
      return new InMemoryPermissionRepository()
    })

    // Permission Registry
    this.core.container.singleton('rbac.registry', (container: any) => {
      return new PermissionRegistry(container.make('rbac.permissionRepository'), this.core)
    })

    // UseCases
    this.core.container.factory('rbac.listRolesUseCase', (container: any) => {
      return new ListRolesUseCase(container.make('rbac.roleRepository'))
    })

    this.core.container.factory('rbac.getRoleUseCase', (container: any) => {
      return new GetRoleUseCase(container.make('rbac.roleRepository'))
    })

    this.core.container.factory('rbac.createRoleUseCase', (container: any) => {
      return new CreateRoleUseCase(container.make('rbac.roleRepository'), this.core)
    })

    this.core.container.factory('rbac.updateRoleUseCase', (container: any) => {
      return new UpdateRoleUseCase(container.make('rbac.roleRepository'), this.core)
    })

    this.core.container.factory('rbac.deleteRoleUseCase', (container: any) => {
      return new DeleteRoleUseCase(container.make('rbac.roleRepository'), this.core)
    })

    this.core.container.factory('rbac.listPermissionsUseCase', (container: any) => {
      return new ListPermissionsUseCase(container.make('rbac.permissionRepository'))
    })

    this.core.container.factory('rbac.syncPermissionsUseCase', (container: any) => {
      return new SyncRolePermissionsUseCase(container.make('rbac.roleRepository'))
    })

    this.core.container.factory('rbac.assignRoleUseCase', (container: any) => {
      return new AssignRoleToAdminUseCase(container.make('rbac.roleRepository'))
    })

    this.core.container.factory('rbac.revokeRoleUseCase', (container: any) => {
      return new RevokeRoleFromAdminUseCase(container.make('rbac.roleRepository'))
    })

    this.core.container.factory('rbac.checkPermissionUseCase', (container: any) => {
      return new CheckPermissionUseCase(
        container.make('rbac.roleRepository'),
        container.make('rbac.permissionRepository')
      )
    })

    // Controllers
    this.core.container.factory('rbac.roleController', (container: any) => {
      return new RoleController(
        container.make('rbac.listRolesUseCase'),
        container.make('rbac.getRoleUseCase'),
        container.make('rbac.createRoleUseCase'),
        container.make('rbac.updateRoleUseCase'),
        container.make('rbac.deleteRoleUseCase'),
        container.make('rbac.syncPermissionsUseCase'),
        container.make('rbac.assignRoleUseCase'),
        container.make('rbac.revokeRoleUseCase')
      )
    })

    this.core.container.factory('rbac.permissionController', (container: any) => {
      return new PermissionController(container.make('rbac.listPermissionsUseCase'))
    })
  }

  async boot(): Promise<void> {
    // 取得依賴
    const checkPermissionUseCase = this.core.container.make('rbac.checkPermissionUseCase')
    const registry = this.core.container.make('rbac.registry') as PermissionRegistry
    const permissionRepo = this.core.container.make('rbac.permissionRepository')
    const roleRepo = this.core.container.make('rbac.roleRepository')

    // 取得 admin middleware（由 admin satellite 提供）
    const adminAuthMiddleware = this.core.container.make('admin.authMiddleware')

    // Seed 系統權限
    await this.seedSystemPermissions(registry)

    // 設定 Gate
    const gateSetup = new RbacGateSetup(roleRepo, permissionRepo, this.core)
    gateSetup.setupGate()

    // Controllers
    const roleController = this.core.container.make('rbac.roleController')
    const permissionController = this.core.container.make('rbac.permissionController')

    // 掛載路由
    const permissionMiddleware = requirePermission('rbac:read', checkPermissionUseCase)
    const manageMiddleware = requirePermission('rbac:manage', checkPermissionUseCase)

    // 角色路由
    this.core.adapter.route(
      'get',
      '/api/admin/v1/rbac/roles',
      adminAuthMiddleware,
      permissionMiddleware,
      (ctx: any) => roleController.index(ctx)
    )
    this.core.adapter.route(
      'get',
      '/api/admin/v1/rbac/roles/:id',
      adminAuthMiddleware,
      permissionMiddleware,
      (ctx: any) => roleController.show(ctx)
    )
    this.core.adapter.route(
      'post',
      '/api/admin/v1/rbac/roles',
      adminAuthMiddleware,
      manageMiddleware,
      (ctx: any) => roleController.store(ctx)
    )
    this.core.adapter.route(
      'patch',
      '/api/admin/v1/rbac/roles/:id',
      adminAuthMiddleware,
      manageMiddleware,
      (ctx: any) => roleController.update(ctx)
    )
    this.core.adapter.route(
      'delete',
      '/api/admin/v1/rbac/roles/:id',
      adminAuthMiddleware,
      manageMiddleware,
      (ctx: any) => roleController.destroy(ctx)
    )
    this.core.adapter.route(
      'put',
      '/api/admin/v1/rbac/roles/:id/permissions',
      adminAuthMiddleware,
      manageMiddleware,
      (ctx: any) => roleController.syncPermissions(ctx)
    )

    // 權限路由
    this.core.adapter.route(
      'get',
      '/api/admin/v1/rbac/permissions',
      adminAuthMiddleware,
      permissionMiddleware,
      (ctx: any) => permissionController.index(ctx)
    )

    // 管理員角色指派路由
    this.core.adapter.route(
      'post',
      '/api/admin/v1/rbac/admins/:adminId/roles',
      adminAuthMiddleware,
      manageMiddleware,
      (ctx: any) => roleController.assignRole(ctx)
    )
    this.core.adapter.route(
      'delete',
      '/api/admin/v1/rbac/admins/:adminId/roles/:roleId',
      adminAuthMiddleware,
      manageMiddleware,
      (ctx: any) => roleController.revokeRole(ctx)
    )

    // 監聽 admin:deleted 事件
    this.core.hooks.addAction('admin:deleted', async (data: any) => {
      if (data.adminId) {
        await (roleRepo as any).removeAllRolesFromAdmin(data.adminId)
      }
    })

    // 支援動態權限註冊
    this.core.hooks.addAction('rbac:register-permissions', async (permissions: any[]) => {
      await registry.registerMany(permissions)
    })

    console.log('✅ RBAC Service booted with system permissions')
  }

  private async seedSystemPermissions(registry: PermissionRegistry): Promise<void> {
    const systemPermissions = [
      { key: 'admin:read', label: '讀取管理員' },
      { key: 'admin:manage', label: '管理員管理' },
      { key: 'rbac:read', label: '讀取角色權限' },
      { key: 'rbac:manage', label: '角色權限管理' },
    ]

    for (const perm of systemPermissions) {
      try {
        await registry.register(perm)
      } catch {
        // 冪等：權限已存在則忽略
      }
    }
  }
}

export { type PermissionDTO, PermissionMapper } from './Application/DTOs/PermissionDTO'
export { type RoleDTO, RoleMapper } from './Application/DTOs/RoleDTO'
export { RbacError, type RbacErrorCode, RbacErrorFactory } from './Application/Errors/RbacError'
export type {
  IPermissionRegistry,
  PermissionRegistryInput,
} from './Domain/Contracts/IPermissionRegistry'
export type {
  IPermissionRepository,
  PermissionFilters,
} from './Domain/Contracts/IPermissionRepository'
export type { IRoleRepository, RoleFilters } from './Domain/Contracts/IRoleRepository'
export { Permission, type PermissionProps } from './Domain/Entities/Permission'
// 匯出 Domain 和 Application 層
export { Role, type RoleProps } from './Domain/Entities/Role'
export { PermissionKey } from './Domain/ValueObjects/PermissionKey'

import { ServiceProvider } from '@gravito/core'
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
export class RbacServiceProvider extends ServiceProvider {
  override register(container: any): void {
    // Repositories
    container.singleton('rbac.roleRepository', () => {
      return new InMemoryRoleRepository()
    })

    container.singleton('rbac.permissionRepository', () => {
      return new InMemoryPermissionRepository()
    })

    // Permission Registry
    container.singleton('rbac.registry', (c: any) => {
      return new PermissionRegistry(c.make('rbac.permissionRepository'), this.core!)
    })

    // UseCases
    container.bind('rbac.listRolesUseCase', (c: any) => {
      return new ListRolesUseCase(c.make('rbac.roleRepository'))
    })

    container.bind('rbac.getRoleUseCase', (c: any) => {
      return new GetRoleUseCase(c.make('rbac.roleRepository'))
    })

    container.bind('rbac.createRoleUseCase', (c: any) => {
      return new CreateRoleUseCase(c.make('rbac.roleRepository'), this.core!)
    })

    container.bind('rbac.updateRoleUseCase', (c: any) => {
      return new UpdateRoleUseCase(c.make('rbac.roleRepository'), this.core!)
    })

    container.bind('rbac.deleteRoleUseCase', (c: any) => {
      return new DeleteRoleUseCase(c.make('rbac.roleRepository'), this.core!)
    })

    container.bind('rbac.listPermissionsUseCase', (c: any) => {
      return new ListPermissionsUseCase(c.make('rbac.permissionRepository'))
    })

    container.bind('rbac.syncPermissionsUseCase', (c: any) => {
      return new SyncRolePermissionsUseCase(c.make('rbac.roleRepository'))
    })

    container.bind('rbac.assignRoleUseCase', (c: any) => {
      return new AssignRoleToAdminUseCase(c.make('rbac.roleRepository'))
    })

    container.bind('rbac.revokeRoleUseCase', (c: any) => {
      return new RevokeRoleFromAdminUseCase(c.make('rbac.roleRepository'))
    })

    container.bind('rbac.checkPermissionUseCase', (c: any) => {
      return new CheckPermissionUseCase(
        c.make('rbac.roleRepository'),
        c.make('rbac.permissionRepository')
      )
    })

    // Controllers
    container.bind('rbac.roleController', (c: any) => {
      return new RoleController(
        c.make('rbac.listRolesUseCase'),
        c.make('rbac.getRoleUseCase'),
        c.make('rbac.createRoleUseCase'),
        c.make('rbac.updateRoleUseCase'),
        c.make('rbac.deleteRoleUseCase'),
        c.make('rbac.syncPermissionsUseCase'),
        c.make('rbac.assignRoleUseCase'),
        c.make('rbac.revokeRoleUseCase')
      )
    })

    container.bind('rbac.permissionController', (c: any) => {
      return new PermissionController(c.make('rbac.listPermissionsUseCase'))
    })
  }

  override async boot(): Promise<void> {
    const core = this.core
    if (!core) {
      return
    }

    // 取得依賴
    const checkPermissionUseCase = core.container.make(
      'rbac.checkPermissionUseCase'
    ) as CheckPermissionUseCase
    const registry = core.container.make('rbac.registry') as PermissionRegistry
    const permissionRepo = core.container.make('rbac.permissionRepository') as any
    const roleRepo = core.container.make('rbac.roleRepository') as any

    // 取得 admin middleware（由 admin satellite 提供）
    const adminAuthMiddleware = core.container.make('admin.authMiddleware') as any

    // Seed 系統權限
    await this.seedSystemPermissions(registry)

    // 設定 Gate
    const gateSetup = new RbacGateSetup(roleRepo, permissionRepo, core)
    gateSetup.setupGate()

    // Controllers
    const roleController = core.container.make('rbac.roleController') as any
    const permissionController = core.container.make('rbac.permissionController') as any

    // 掛載路由
    const permissionMiddleware = requirePermission('rbac:read', checkPermissionUseCase) as any
    const manageMiddleware = requirePermission('rbac:manage', checkPermissionUseCase) as any

    // 角色路由
    core.adapter.route(
      'get',
      '/api/admin/v1/rbac/roles',
      adminAuthMiddleware as any,
      permissionMiddleware,
      (ctx: any) => roleController.index(ctx)
    )
    core.adapter.route(
      'get',
      '/api/admin/v1/rbac/roles/:id',
      adminAuthMiddleware as any,
      permissionMiddleware,
      (ctx: any) => roleController.show(ctx)
    )
    core.adapter.route(
      'post',
      '/api/admin/v1/rbac/roles',
      adminAuthMiddleware as any,
      manageMiddleware,
      (ctx: any) => roleController.store(ctx)
    )
    core.adapter.route(
      'patch',
      '/api/admin/v1/rbac/roles/:id',
      adminAuthMiddleware as any,
      manageMiddleware,
      (ctx: any) => roleController.update(ctx)
    )
    core.adapter.route(
      'delete',
      '/api/admin/v1/rbac/roles/:id',
      adminAuthMiddleware as any,
      manageMiddleware,
      (ctx: any) => roleController.destroy(ctx)
    )
    core.adapter.route(
      'put',
      '/api/admin/v1/rbac/roles/:id/permissions',
      adminAuthMiddleware as any,
      manageMiddleware,
      (ctx: any) => roleController.syncPermissions(ctx)
    )

    // 權限路由
    core.adapter.route(
      'get',
      '/api/admin/v1/rbac/permissions',
      adminAuthMiddleware as any,
      permissionMiddleware,
      (ctx: any) => permissionController.index(ctx)
    )

    // 管理員角色指派路由
    core.adapter.route(
      'post',
      '/api/admin/v1/rbac/admins/:adminId/roles',
      adminAuthMiddleware as any,
      manageMiddleware,
      (ctx: any) => roleController.assignRole(ctx)
    )
    core.adapter.route(
      'delete',
      '/api/admin/v1/rbac/admins/:adminId/roles/:roleId',
      adminAuthMiddleware as any,
      manageMiddleware,
      (ctx: any) => roleController.revokeRole(ctx)
    )

    // 監聽 admin:deleted 事件
    core.hooks.addAction('admin:deleted', async (data: any) => {
      if (data.adminId) {
        await (roleRepo as any).removeAllRolesFromAdmin(data.adminId)
      }
    })

    // 支援動態權限註冊
    core.hooks.addAction('rbac:register-permissions', async (permissions: any[]) => {
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

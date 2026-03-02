import { beforeEach, describe, expect, it } from 'bun:test'
import type { IPermissionRepository } from '../../src/Domain/Contracts/IPermissionRepository'
import type { IRoleRepository } from '../../src/Domain/Contracts/IRoleRepository'
import { Permission } from '../../src/Domain/Entities/Permission'
import { Role } from '../../src/Domain/Entities/Role'
import { PermissionKey } from '../../src/Domain/ValueObjects/PermissionKey'
import { RbacServiceProvider } from '../../src/index'

// 模擬 IoC Container
class MockContainer {
  private bindings = new Map<string, { factory: Function; isSingleton: boolean }>()
  private instances = new Map<string, unknown>()

  singleton(key: string, factory: Function): void {
    this.bindings.set(key, { factory, isSingleton: true })
  }

  factory(key: string, factory: Function): void {
    this.bindings.set(key, { factory, isSingleton: false })
  }

  make(key: string): unknown {
    if (this.instances.has(key)) {
      return this.instances.get(key)
    }

    const binding = this.bindings.get(key)
    if (!binding) {
      return undefined
    }

    const instance = binding.factory(this)
    if (binding.isSingleton) {
      this.instances.set(key, instance)
    }
    return instance
  }

  has(key: string): boolean {
    return this.bindings.has(key)
  }

  // 直接設定實例（用於注入外部依賴如 admin.authMiddleware）
  setInstance(key: string, instance: unknown): void {
    this.instances.set(key, instance)
    this.bindings.set(key, { factory: () => instance, isSingleton: true })
  }
}

// 模擬 Adapter
class MockAdapter {
  private routes: Array<{ method: string; path: string }> = []

  route(method: string, path: string, ...handlers: Function[]): void {
    this.routes.push({ method: method.toUpperCase(), path })
  }

  getRoutes(): Array<{ method: string; path: string }> {
    return this.routes
  }
}

// Mock Sentinel Gate
class MockGate {
  private beforeCallbacks: Function[] = []
  private definitions = new Map<string, Function>()

  before(callback: Function): void {
    this.beforeCallbacks.push(callback)
  }

  define(ability: string, callback: Function): void {
    this.definitions.set(ability, callback)
  }

  getBeforeCallbacks(): Function[] {
    return this.beforeCallbacks
  }

  getDefinitions(): Map<string, Function> {
    return this.definitions
  }
}

// Mock PlanetCore
function createMockCore(): {
  container: MockContainer
  hooks: {
    doAction: Function
    addAction: Function
    addFilter: Function
    applyFilters: Function
    actions: Map<string, Function[]>
  }
} {
  const container = new MockContainer()
  const adapter = new MockAdapter()
  const gate = new MockGate()
  const actions = new Map<string, Function[]>()

  // 註冊外部依賴
  container.setInstance('sentinel.gate', gate)

  // 模擬 admin.authMiddleware（由 admin satellite 提供）
  const mockAdminAuthMiddleware = async () => {}
  container.setInstance('admin.authMiddleware', mockAdminAuthMiddleware)

  return {
    container,
    adapter,
    hooks: {
      doAction: async (tag: string, data: unknown) => {
        const handlers = actions.get(tag) ?? []
        for (const handler of handlers) {
          await handler(data)
        }
      },
      addAction: (tag: string, handler: Function) => {
        if (!actions.has(tag)) {
          actions.set(tag, [])
        }
        actions.get(tag)!.push(handler)
      },
      addFilter: () => {},
      applyFilters: async (_tag: string, value: unknown) => value,
      actions,
    },
  }
}

describe('RbacServiceProvider', () => {
  let core: ReturnType<typeof createMockCore>
  let provider: RbacServiceProvider

  beforeEach(() => {
    core = createMockCore()
    provider = new RbacServiceProvider(core)
  })

  it('register() 綁定所有依賴到容器', () => {
    provider.register()

    // 驗證 Repositories
    expect(core.container.has('rbac.roleRepository')).toBe(true)
    expect(core.container.has('rbac.permissionRepository')).toBe(true)

    // 驗證 Registry
    expect(core.container.has('rbac.registry')).toBe(true)

    // 驗證 UseCases
    expect(core.container.has('rbac.listRolesUseCase')).toBe(true)
    expect(core.container.has('rbac.getRoleUseCase')).toBe(true)
    expect(core.container.has('rbac.createRoleUseCase')).toBe(true)
    expect(core.container.has('rbac.updateRoleUseCase')).toBe(true)
    expect(core.container.has('rbac.deleteRoleUseCase')).toBe(true)
    expect(core.container.has('rbac.listPermissionsUseCase')).toBe(true)
    expect(core.container.has('rbac.syncPermissionsUseCase')).toBe(true)
    expect(core.container.has('rbac.assignRoleUseCase')).toBe(true)
    expect(core.container.has('rbac.revokeRoleUseCase')).toBe(true)
    expect(core.container.has('rbac.checkPermissionUseCase')).toBe(true)

    // 驗證 Controllers
    expect(core.container.has('rbac.roleController')).toBe(true)
    expect(core.container.has('rbac.permissionController')).toBe(true)
  })

  it('boot() 掛載路由', async () => {
    provider.register()
    await provider.boot()

    const routes = core.adapter.getRoutes()
    const routePaths = routes.map((r) => `${r.method} ${r.path}`)

    // 角色路由
    expect(routePaths).toContain('GET /api/admin/v1/rbac/roles')
    expect(routePaths).toContain('GET /api/admin/v1/rbac/roles/:id')
    expect(routePaths).toContain('POST /api/admin/v1/rbac/roles')
    expect(routePaths).toContain('PATCH /api/admin/v1/rbac/roles/:id')
    expect(routePaths).toContain('DELETE /api/admin/v1/rbac/roles/:id')
    expect(routePaths).toContain('PUT /api/admin/v1/rbac/roles/:id/permissions')

    // 權限路由
    expect(routePaths).toContain('GET /api/admin/v1/rbac/permissions')

    // 管理員角色指派路由
    expect(routePaths).toContain('POST /api/admin/v1/rbac/admins/:adminId/roles')
    expect(routePaths).toContain('DELETE /api/admin/v1/rbac/admins/:adminId/roles/:roleId')
  })

  it('boot() 種子系統權限', async () => {
    provider.register()
    await provider.boot()

    const permissionRepo = core.container.make('rbac.permissionRepository') as IPermissionRepository

    // 檢查系統權限已建立
    const allPerms = await permissionRepo.findAll()
    const permKeys = allPerms.map((p) => p.key.value)

    expect(permKeys).toContain('admin:read')
    expect(permKeys).toContain('admin:manage')
    expect(permKeys).toContain('rbac:read')
    expect(permKeys).toContain('rbac:manage')
  })

  it('boot() 設定 Gate', async () => {
    provider.register()
    await provider.boot()

    const gate = core.container.make('sentinel.gate') as MockGate

    // 應該有 before callback（super admin 快速通過）
    expect(gate.getBeforeCallbacks().length).toBeGreaterThan(0)

    // 應該有萬用字元權限定義
    expect(gate.getDefinitions().has('*')).toBe(true)
  })

  it('rbac:register-permissions hook 運作正常', async () => {
    provider.register()
    await provider.boot()

    // 透過 hook 動態註冊新權限
    const newPermissions = [
      { key: 'catalog:read', label: 'Read Catalog' },
      { key: 'catalog:manage', label: 'Manage Catalog' },
    ]

    await core.hooks.doAction('rbac:register-permissions', newPermissions)

    // 驗證權限已註冊
    const permissionRepo = core.container.make('rbac.permissionRepository') as IPermissionRepository
    const allPerms = await permissionRepo.findAll()
    const permKeys = allPerms.map((p) => p.key.value)

    expect(permKeys).toContain('catalog:read')
    expect(permKeys).toContain('catalog:manage')
  })

  it('admin:deleted listener 清理 admin_roles', async () => {
    provider.register()
    await provider.boot()

    // 先指派角色
    const roleRepo = core.container.make('rbac.roleRepository') as IRoleRepository & {
      assignRole: (adminId: string, roleId: string) => Promise<void>
      getAdminRoleIds: (adminId: string) => Promise<string[]>
    }

    const role = Role.create('cleanup-role', {
      name: 'temp',
      displayName: 'Temporary',
    })
    await roleRepo.save(role)
    await roleRepo.assignRole('admin-to-delete', 'cleanup-role')

    // 確認角色已指派
    const beforeRoleIds = await roleRepo.getAdminRoleIds('admin-to-delete')
    expect(beforeRoleIds).toContain('cleanup-role')

    // 觸發 admin:deleted 事件
    await core.hooks.doAction('admin:deleted', { adminId: 'admin-to-delete' })

    // 驗證 admin 的角色已清理
    const afterRoleIds = await roleRepo.getAdminRoleIds('admin-to-delete')
    expect(afterRoleIds).toEqual([])
  })
})

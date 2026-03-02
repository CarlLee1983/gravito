import { beforeEach, describe, expect, it } from 'bun:test'
import type { GravitoContext, PlanetCore } from '@gravito/core'
import { AssignRoleToAdminUseCase } from '../../src/Application/UseCases/AssignRoleToAdmin'
import { CreateRoleUseCase } from '../../src/Application/UseCases/CreateRole'
import { DeleteRoleUseCase } from '../../src/Application/UseCases/DeleteRole'
import { GetRoleUseCase } from '../../src/Application/UseCases/GetRole'
import { ListRolesUseCase } from '../../src/Application/UseCases/ListRoles'
import { RevokeRoleFromAdminUseCase } from '../../src/Application/UseCases/RevokeRoleFromAdmin'
import { SyncRolePermissionsUseCase } from '../../src/Application/UseCases/SyncRolePermissions'
import { UpdateRoleUseCase } from '../../src/Application/UseCases/UpdateRole'
import { Role } from '../../src/Domain/Entities/Role'
import { InMemoryRoleRepository } from '../../src/Infrastructure/Persistence/AtlasRoleRepository'
import { RoleController } from '../../src/Interface/Http/Controllers/RoleController'

// Mock PlanetCore
function createMockCore(): PlanetCore {
  return {
    hooks: {
      doAction: async () => {},
      addAction: () => {},
      addFilter: () => {},
      applyFilters: async (_tag: string, value: unknown) => value,
    },
  } as unknown as PlanetCore
}

// Mock GravitoContext
function createMockContext(options?: {
  params?: Record<string, string>
  query?: Record<string, string>
  json?: unknown
  contextValues?: Record<string, unknown>
}): {
  ctx: GravitoContext
  getJsonResponse: () => { data: unknown; status: number } | null
} {
  const contextStore = new Map<string, unknown>()
  let jsonResponse: { data: unknown; status: number } | null = null

  if (options?.contextValues) {
    for (const [key, value] of Object.entries(options.contextValues)) {
      contextStore.set(key, value)
    }
  }

  const ctx = {
    req: {
      param: (name: string) => options?.params?.[name] ?? '',
      query: (name: string) => options?.query?.[name] ?? undefined,
      json: async () => options?.json ?? {},
    },
    json: (data: unknown, status: number) => {
      jsonResponse = { data, status }
      return new Response(JSON.stringify(data), { status })
    },
    get: (key: string) => contextStore.get(key),
    set: (key: string, value: unknown) => contextStore.set(key, value),
  } as unknown as GravitoContext

  return { ctx, getJsonResponse: () => jsonResponse }
}

describe('RoleController', () => {
  let roleRepo: InMemoryRoleRepository
  let core: PlanetCore
  let controller: RoleController

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository()
    core = createMockCore()

    const listUseCase = new ListRolesUseCase(roleRepo)
    const getUseCase = new GetRoleUseCase(roleRepo)
    const createUseCase = new CreateRoleUseCase(roleRepo, core)
    const updateUseCase = new UpdateRoleUseCase(roleRepo, core)
    const deleteUseCase = new DeleteRoleUseCase(roleRepo, core)
    const syncUseCase = new SyncRolePermissionsUseCase(roleRepo)
    const assignUseCase = new AssignRoleToAdminUseCase(roleRepo)
    const revokeUseCase = new RevokeRoleFromAdminUseCase(roleRepo)

    controller = new RoleController(
      listUseCase,
      getUseCase,
      createUseCase,
      updateUseCase,
      deleteUseCase,
      syncUseCase,
      assignUseCase,
      revokeUseCase
    )
  })

  it('index() 回傳分頁角色列表', async () => {
    // 建立測試角色
    const role1 = Role.create('role-1', {
      name: 'admin',
      displayName: 'Administrator',
    })
    const role2 = Role.create('role-2', {
      name: 'editor',
      displayName: 'Editor',
    })
    await roleRepo.save(role1)
    await roleRepo.save(role2)

    const { ctx, getJsonResponse } = createMockContext({
      query: { page: '1', limit: '10' },
    })

    await controller.index(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.total).toBe(2)
    expect(data.page).toBe(1)
    expect(Array.isArray(data.items)).toBe(true)
    expect((data.items as unknown[]).length).toBe(2)
  })

  it('show() 回傳單一角色', async () => {
    const role = Role.create('show-role', {
      name: 'viewer',
      displayName: 'Viewer',
      description: 'Read-only viewer role',
    })
    await roleRepo.save(role)

    const { ctx, getJsonResponse } = createMockContext({
      params: { id: 'show-role' },
    })

    await controller.show(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.id).toBe('show-role')
    expect(data.name).toBe('viewer')
    expect(data.displayName).toBe('Viewer')
    expect(data.description).toBe('Read-only viewer role')
  })

  it('store() 超級管理員建立角色', async () => {
    const superAdmin = { isSuper: true }

    const { ctx, getJsonResponse } = createMockContext({
      json: {
        name: 'moderator',
        displayName: 'Moderator',
        description: 'Content moderation',
      },
      contextValues: { admin: superAdmin },
    })

    await controller.store(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(201)

    const data = response!.data as Record<string, unknown>
    expect(data.name).toBe('moderator')
    expect(data.displayName).toBe('Moderator')
    expect(data.description).toBe('Content moderation')
    expect(data.isSystem).toBe(false)
  })

  it('update() 修改角色', async () => {
    const role = Role.create('update-role', { name: 'editor', displayName: 'Editor' })
    await roleRepo.save(role)

    const { ctx, getJsonResponse } = createMockContext({
      params: { id: 'update-role' },
      json: { displayName: 'Senior Editor', description: 'Advanced editing' },
    })

    await controller.update(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.displayName).toBe('Senior Editor')
    expect(data.description).toBe('Advanced editing')
  })

  it('destroy() 刪除角色', async () => {
    const role = Role.create('delete-role', { name: 'temp', displayName: 'Temporary' })
    await roleRepo.save(role)

    const superAdmin = { isSuper: true }

    const { ctx, getJsonResponse } = createMockContext({
      params: { id: 'delete-role' },
      contextValues: { admin: superAdmin },
    })

    await controller.destroy(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)
    expect((response!.data as Record<string, unknown>).success).toBe(true)

    // 驗證已刪除
    const deleted = await roleRepo.findById('delete-role')
    expect(deleted).toBeNull()
  })

  it('syncPermissions() 更新角色權限', async () => {
    const role = Role.create('sync-role', { name: 'editor', displayName: 'Editor' })
    await roleRepo.save(role)

    const { ctx, getJsonResponse } = createMockContext({
      params: { id: 'sync-role' },
      json: { permissionIds: ['perm-1', 'perm-2', 'perm-3'] },
    })

    await controller.syncPermissions(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.permissionIds).toEqual(['perm-1', 'perm-2', 'perm-3'])
  })
})

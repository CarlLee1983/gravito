import { beforeEach, describe, expect, it } from 'bun:test'
import type { Context } from 'hono'
import { ListPermissionsUseCase } from '../../src/Application/UseCases/ListPermissions'
import { Permission } from '../../src/Domain/Entities/Permission'
import { PermissionKey } from '../../src/Domain/ValueObjects/PermissionKey'
import { InMemoryPermissionRepository } from '../../src/Infrastructure/Persistence/AtlasPermissionRepository'
import { PermissionController } from '../../src/Interface/Http/Controllers/PermissionController'

// Mock Hono Context
function createMockContext(options?: { query?: Record<string, string> }): {
  ctx: Context
  getJsonResponse: () => { data: unknown; status: number } | null
} {
  let jsonResponse: { data: unknown; status: number } | null = null

  const ctx = {
    req: {
      query: (name: string) => options?.query?.[name] ?? undefined,
    },
    json: (data: unknown, status: number) => {
      jsonResponse = { data, status }
      return new Response(JSON.stringify(data), { status })
    },
  } as unknown as Context

  return { ctx, getJsonResponse: () => jsonResponse }
}

describe('PermissionController', () => {
  let permissionRepo: InMemoryPermissionRepository
  let controller: PermissionController

  beforeEach(() => {
    permissionRepo = new InMemoryPermissionRepository()
    const listUseCase = new ListPermissionsUseCase(permissionRepo)
    controller = new PermissionController(listUseCase)
  })

  it('index() 回傳分頁權限列表', async () => {
    // 建立測試權限
    const key1 = PermissionKey.create('admin:read')
    const perm1 = Permission.create('perm-1', key1, 'Read Admin')
    await permissionRepo.save(perm1)

    const key2 = PermissionKey.create('admin:manage')
    const perm2 = Permission.create('perm-2', key2, 'Manage Admin')
    await permissionRepo.save(perm2)

    const key3 = PermissionKey.create('rbac:read')
    const perm3 = Permission.create('perm-3', key3, 'Read RBAC')
    await permissionRepo.save(perm3)

    const { ctx, getJsonResponse } = createMockContext({
      query: { page: '1', limit: '10' },
    })

    await controller.index(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.total).toBe(3)
    expect(data.page).toBe(1)
    expect(Array.isArray(data.items)).toBe(true)
    expect((data.items as unknown[]).length).toBe(3)
  })

  it('index() 依群組名稱過濾', async () => {
    // 建立不同群組的權限
    const adminKey1 = PermissionKey.create('admin:read')
    const adminPerm1 = Permission.create('perm-a1', adminKey1, 'Read Admin')
    await permissionRepo.save(adminPerm1)

    const adminKey2 = PermissionKey.create('admin:manage')
    const adminPerm2 = Permission.create('perm-a2', adminKey2, 'Manage Admin')
    await permissionRepo.save(adminPerm2)

    const rbacKey = PermissionKey.create('rbac:read')
    const rbacPerm = Permission.create('perm-r1', rbacKey, 'Read RBAC')
    await permissionRepo.save(rbacPerm)

    const catalogKey = PermissionKey.create('catalog:read')
    const catalogPerm = Permission.create('perm-c1', catalogKey, 'Read Catalog')
    await permissionRepo.save(catalogPerm)

    // 過濾 admin 群組
    const { ctx, getJsonResponse } = createMockContext({
      query: { page: '1', limit: '10', groupName: 'admin' },
    })

    await controller.index(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.total).toBe(2)
    expect((data.items as unknown[]).length).toBe(2)

    // 驗證過濾結果只有 admin 群組
    const items = data.items as Record<string, unknown>[]
    for (const item of items) {
      expect(item.groupName).toBe('admin')
    }
  })
})

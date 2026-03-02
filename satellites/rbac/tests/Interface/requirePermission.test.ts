import { beforeEach, describe, expect, it } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import { CheckPermissionUseCase } from '../../src/Application/UseCases/CheckPermission'
import { Permission } from '../../src/Domain/Entities/Permission'
import { Role } from '../../src/Domain/Entities/Role'
import { PermissionKey } from '../../src/Domain/ValueObjects/PermissionKey'
import { InMemoryPermissionRepository } from '../../src/Infrastructure/Persistence/AtlasPermissionRepository'
import { InMemoryRoleRepository } from '../../src/Infrastructure/Persistence/AtlasRoleRepository'
import { requirePermission } from '../../src/Interface/Http/Middleware/requirePermission'

// Mock GravitoContext
function createMockContext(options?: { contextValues?: Record<string, unknown> }): {
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
    req: {},
    json: (data: unknown, status: number) => {
      jsonResponse = { data, status }
      return new Response(JSON.stringify(data), { status })
    },
    get: (key: string) => contextStore.get(key),
    set: (key: string, value: unknown) => contextStore.set(key, value),
  } as unknown as GravitoContext

  return { ctx, getJsonResponse: () => jsonResponse }
}

describe('requirePermission', () => {
  let roleRepo: InMemoryRoleRepository
  let permissionRepo: InMemoryPermissionRepository
  let checkUseCase: CheckPermissionUseCase

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository()
    permissionRepo = new InMemoryPermissionRepository()
    checkUseCase = new CheckPermissionUseCase(roleRepo, permissionRepo)
  })

  it('super admin 繞過權限檢查', async () => {
    const superAdmin = { id: 'super-1', isSuper: true, isActive: true }
    const middleware = requirePermission('admin:manage', checkUseCase)

    const { ctx } = createMockContext({
      contextValues: { admin: superAdmin },
    })

    let nextCalled = false
    const next = async () => {
      nextCalled = true
    }

    await middleware(ctx, next)

    expect(nextCalled).toBe(true)
  })

  it('具備權限的 admin 通過檢查', async () => {
    // 建立權限
    const permKey = PermissionKey.create('rbac:read')
    const permission = Permission.create('perm-1', permKey, 'Read RBAC')
    await permissionRepo.save(permission)

    // 建立角色並授予權限
    const role = Role.create('role-1', {
      name: 'moderator',
      displayName: 'Moderator',
      permissionIds: ['perm-1'],
    })
    await roleRepo.save(role)

    // 指派角色給 admin
    await roleRepo.assignRole('admin-1', 'role-1')

    const admin = { id: 'admin-1', isSuper: false, isActive: true }
    const middleware = requirePermission('rbac:read', checkUseCase)

    const { ctx } = createMockContext({
      contextValues: { admin },
    })

    let nextCalled = false
    const next = async () => {
      nextCalled = true
    }

    await middleware(ctx, next)

    expect(nextCalled).toBe(true)
  })

  it('缺少權限的 admin 回傳 403', async () => {
    const admin = { id: 'admin-2', isSuper: false, isActive: true }
    const middleware = requirePermission('admin:manage', checkUseCase)

    const { ctx, getJsonResponse } = createMockContext({
      contextValues: { admin },
    })

    let nextCalled = false
    const next = async () => {
      nextCalled = true
    }

    await middleware(ctx, next)

    expect(nextCalled).toBe(false)
    const response = getJsonResponse()
    expect(response).not.toBeNull()
    expect(response!.status).toBe(403)
    expect((response!.data as Record<string, unknown>).error).toContain('Forbidden')
  })

  it('缺少 admin 回傳 401', async () => {
    const middleware = requirePermission('admin:manage', checkUseCase)

    const { ctx, getJsonResponse } = createMockContext({
      contextValues: {},
    })

    let nextCalled = false
    const next = async () => {
      nextCalled = true
    }

    await middleware(ctx, next)

    expect(nextCalled).toBe(false)
    const response = getJsonResponse()
    expect(response).not.toBeNull()
    expect(response!.status).toBe(401)
    expect((response!.data as Record<string, unknown>).error).toBe('Unauthorized')
  })
})

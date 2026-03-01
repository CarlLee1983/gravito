import { beforeEach, describe, expect, it } from 'bun:test'
import { ListPermissionsUseCase } from '../../src/Application/UseCases/ListPermissions'
import type {
  IPermissionRepository,
  PaginatedResult,
  PaginationOptions,
  PermissionFilters,
} from '../../src/Domain/Contracts/IPermissionRepository'
import { Permission } from '../../src/Domain/Entities/Permission'
import { PermissionKey } from '../../src/Domain/ValueObjects/PermissionKey'

// InMemory PermissionRepository（含篩選支援）
class InMemoryPermissionRepository implements IPermissionRepository {
  private permissions = new Map<string, Permission>()

  async save(permission: Permission): Promise<void> {
    this.permissions.set(permission.id, permission)
  }

  async findById(id: string): Promise<Permission | null> {
    return this.permissions.get(id) ?? null
  }

  async findByKey(key: PermissionKey): Promise<Permission | null> {
    for (const p of this.permissions.values()) {
      if (p.key.value === key.value) return p
    }
    return null
  }

  async findByKeys(keys: PermissionKey[]): Promise<Permission[]> {
    const keyValues = keys.map((k) => k.value)
    return Array.from(this.permissions.values()).filter((p) => keyValues.includes(p.key.value))
  }

  async findByGroup(groupName: string): Promise<Permission[]> {
    return Array.from(this.permissions.values()).filter((p) => p.groupName === groupName)
  }

  async findWithPagination(
    filters: PermissionFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Permission>> {
    let items = Array.from(this.permissions.values())

    // 套用篩選
    if (filters.groupName) {
      items = items.filter((p) => p.groupName === filters.groupName)
    }
    if (filters.isSystem !== undefined) {
      items = items.filter((p) => p.isSystem === filters.isSystem)
    }

    const total = items.length
    const start = (options.page - 1) * options.limit
    const paged = items.slice(start, start + options.limit)

    return {
      items: paged,
      total,
      page: options.page,
      limit: options.limit,
    }
  }

  async findAll(): Promise<Permission[]> {
    return Array.from(this.permissions.values())
  }

  async delete(id: string): Promise<void> {
    this.permissions.delete(id)
  }

  async exists(key: PermissionKey): Promise<boolean> {
    for (const p of this.permissions.values()) {
      if (p.key.value === key.value) return true
    }
    return false
  }

  seed(permission: Permission): void {
    this.permissions.set(permission.id, permission)
  }
}

describe('ListPermissionsUseCase', () => {
  let repo: InMemoryPermissionRepository
  let useCase: ListPermissionsUseCase

  beforeEach(() => {
    repo = new InMemoryPermissionRepository()
    useCase = new ListPermissionsUseCase(repo)

    // 種子資料
    repo.seed(
      Permission.create('perm-1', PermissionKey.create('products:create'), 'Create Products', {
        isSystem: true,
      })
    )
    repo.seed(
      Permission.create('perm-2', PermissionKey.create('products:update'), 'Update Products', {
        isSystem: true,
      })
    )
    repo.seed(
      Permission.create('perm-3', PermissionKey.create('orders:read'), 'Read Orders', {
        isSystem: false,
      })
    )
  })

  it('列表回傳分頁權限', async () => {
    const result = await useCase.execute({}, { page: 1, limit: 10 })

    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(3)
    expect(result.page).toBe(1)

    // 驗證 DTO 結構
    const firstItem = result.items[0]
    expect(firstItem.id).toBeDefined()
    expect(firstItem.key).toBeDefined()
    expect(firstItem.groupName).toBeDefined()
    expect(firstItem.action).toBeDefined()
    expect(firstItem.label).toBeDefined()
    expect(firstItem.isSystem).toBeDefined()
    expect(firstItem.createdAt).toBeDefined()
  })

  it('依 group name 篩選', async () => {
    const result = await useCase.execute({ groupName: 'products' }, { page: 1, limit: 10 })

    expect(result.items).toHaveLength(2)
    expect(result.items.every((p) => p.groupName === 'products')).toBe(true)
    expect(result.total).toBe(2)
  })
})

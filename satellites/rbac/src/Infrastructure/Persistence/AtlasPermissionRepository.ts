import type {
  IPermissionRepository,
  PaginatedResult,
  PaginationOptions,
  PermissionFilters,
} from '../../Domain/Contracts/IPermissionRepository'
import type { Permission } from '../../Domain/Entities/Permission'
import type { PermissionKey } from '../../Domain/ValueObjects/PermissionKey'

/**
 * Permission 的 InMemory 實作（用於測試和開發）
 */
export class InMemoryPermissionRepository implements IPermissionRepository {
  private permissions = new Map<string, Permission>()
  private keyIndex = new Map<string, string>() // key -> permissionId

  async save(permission: Permission): Promise<void> {
    this.permissions.set(permission.id, permission)
    this.keyIndex.set(permission.key.value, permission.id)
  }

  async findById(id: string): Promise<Permission | null> {
    return this.permissions.get(id) ?? null
  }

  async findByKey(key: PermissionKey): Promise<Permission | null> {
    const id = this.keyIndex.get(key.value)
    if (!id) {
      return null
    }
    return this.permissions.get(id) ?? null
  }

  async findByKeys(keys: PermissionKey[]): Promise<Permission[]> {
    const result: Permission[] = []
    for (const key of keys) {
      const perm = await this.findByKey(key)
      if (perm) {
        result.push(perm)
      }
    }
    return result
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    const result: Permission[] = []
    for (const id of ids) {
      const perm = this.permissions.get(id)
      if (perm) {
        result.push(perm)
      }
    }
    return result
  }

  async findByGroup(groupName: string): Promise<Permission[]> {
    const result: Permission[] = []
    for (const perm of this.permissions.values()) {
      if (perm.groupName === groupName) {
        result.push(perm)
      }
    }
    return result
  }

  async findWithPagination(
    filters: PermissionFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Permission>> {
    let results = Array.from(this.permissions.values())

    // 應用過濾器
    if (filters.groupName) {
      results = results.filter((p) => p.groupName === filters.groupName)
    }
    if (filters.isSystem !== undefined) {
      results = results.filter((p) => p.isSystem === filters.isSystem)
    }

    // 應用分頁
    const total = results.length
    const startIdx = (options.page - 1) * options.limit
    const endIdx = startIdx + options.limit
    const items = results.slice(startIdx, endIdx)

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
    }
  }

  async findAll(): Promise<Permission[]> {
    return Array.from(this.permissions.values())
  }

  async delete(id: string): Promise<void> {
    const perm = this.permissions.get(id)
    if (perm) {
      this.keyIndex.delete(perm.key.value)
    }
    this.permissions.delete(id)
  }

  async exists(key: PermissionKey): Promise<boolean> {
    return this.keyIndex.has(key.value)
  }
}

/**
 * 實際的 Atlas ORM 實作佔位符
 */
export class AtlasPermissionRepository implements IPermissionRepository {
  constructor(private readonly db: any) {}

  async save(permission: Permission): Promise<void> {}

  async findById(id: string): Promise<Permission | null> {
    return null
  }

  async findByKey(key: PermissionKey): Promise<Permission | null> {
    return null
  }

  async findByKeys(keys: PermissionKey[]): Promise<Permission[]> {
    return []
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return []
  }

  async findByGroup(groupName: string): Promise<Permission[]> {
    return []
  }

  async findWithPagination(
    filters: PermissionFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Permission>> {
    return {
      items: [],
      total: 0,
      page: options.page,
      limit: options.limit,
    }
  }

  async findAll(): Promise<Permission[]> {
    return []
  }

  async delete(id: string): Promise<void> {}

  async exists(key: PermissionKey): Promise<boolean> {
    return false
  }
}

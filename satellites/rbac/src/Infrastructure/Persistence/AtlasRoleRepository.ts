import type {
  IRoleRepository,
  PaginatedResult,
  PaginationOptions,
  RoleFilters,
} from '../../Domain/Contracts/IRoleRepository'
import type { Role } from '../../Domain/Entities/Role'

/**
 * Role 的 InMemory 實作（用於測試和開發）
 */
export class InMemoryRoleRepository implements IRoleRepository {
  private roles = new Map<string, Role>()
  private adminRoles = new Map<string, string[]>() // adminId -> roleIds[]

  async save(role: Role): Promise<void> {
    this.roles.set(role.id, role)
  }

  async findById(id: string): Promise<Role | null> {
    return this.roles.get(id) ?? null
  }

  async findByName(name: string): Promise<Role | null> {
    for (const role of this.roles.values()) {
      if (role.name === name) {
        return role
      }
    }
    return null
  }

  async findWithPagination(
    filters: RoleFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Role>> {
    let results = Array.from(this.roles.values())

    // 應用過濾器
    if (filters.isSystem !== undefined) {
      results = results.filter((r) => r.isSystem === filters.isSystem)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      results = results.filter(
        (r) => r.name.toLowerCase().includes(search) || r.displayName.toLowerCase().includes(search)
      )
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

  async findAll(): Promise<Role[]> {
    return Array.from(this.roles.values())
  }

  async delete(id: string): Promise<void> {
    this.roles.delete(id)
    // 清除 admin_roles 關聯
    for (const roleIds of this.adminRoles.values()) {
      const idx = roleIds.indexOf(id)
      if (idx >= 0) {
        roleIds.splice(idx, 1)
      }
    }
  }

  async exists(name: string): Promise<boolean> {
    for (const role of this.roles.values()) {
      if (role.name === name) {
        return true
      }
    }
    return false
  }

  // admin_roles 操作
  async getAdminRoleIds(adminId: string): Promise<string[]> {
    return this.adminRoles.get(adminId) ?? []
  }

  async assignRole(adminId: string, roleId: string): Promise<void> {
    if (!this.adminRoles.has(adminId)) {
      this.adminRoles.set(adminId, [])
    }
    const roleIds = this.adminRoles.get(adminId)!
    if (!roleIds.includes(roleId)) {
      roleIds.push(roleId)
    }
  }

  async revokeRole(adminId: string, roleId: string): Promise<void> {
    const roleIds = this.adminRoles.get(adminId)
    if (roleIds) {
      const idx = roleIds.indexOf(roleId)
      if (idx >= 0) {
        roleIds.splice(idx, 1)
      }
    }
  }

  async removeAllRolesFromAdmin(adminId: string): Promise<void> {
    this.adminRoles.delete(adminId)
  }
}

/**
 * 實際的 Atlas ORM 實作佔位符
 */
export class AtlasRoleRepository implements IRoleRepository {
  constructor(private readonly db: any) {}

  async save(role: Role): Promise<void> {
    // 實際實作應使用 Atlas
  }

  async findById(id: string): Promise<Role | null> {
    return null
  }

  async findByName(name: string): Promise<Role | null> {
    return null
  }

  async findWithPagination(
    filters: RoleFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Role>> {
    return {
      items: [],
      total: 0,
      page: options.page,
      limit: options.limit,
    }
  }

  async findAll(): Promise<Role[]> {
    return []
  }

  async delete(id: string): Promise<void> {}
  async exists(name: string): Promise<boolean> {
    return false
  }

  async getAdminRoleIds(adminId: string): Promise<string[]> {
    return []
  }

  async assignRole(adminId: string, roleId: string): Promise<void> {}
  async revokeRole(adminId: string, roleId: string): Promise<void> {}
  async removeAllRolesFromAdmin(adminId: string): Promise<void> {}
}

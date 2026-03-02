import type {
  AdminFilters,
  IAdminRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../Domain/Contracts/IAdminRepository'
import type { Admin } from '../../Domain/Entities/Admin'

/**
 * Admin 的 InMemory 實作（用於測試和開發）
 * 實際生產環境應使用 @gravito/atlas ORM
 */
export class InMemoryAdminRepository implements IAdminRepository {
  private admins = new Map<string, Admin>()

  async save(admin: Admin): Promise<void> {
    this.admins.set(admin.id, admin)
  }

  async findById(id: string): Promise<Admin | null> {
    return this.admins.get(id) ?? null
  }

  async findByEmail(email: string): Promise<Admin | null> {
    for (const admin of this.admins.values()) {
      if (admin.email.value === email) {
        return admin
      }
    }
    return null
  }

  async findByPasswordResetToken(token: string): Promise<Admin | null> {
    for (const admin of this.admins.values()) {
      if (admin.passwordResetToken === token) {
        return admin
      }
    }
    return null
  }

  async findWithPagination(
    filters: AdminFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Admin>> {
    let results = Array.from(this.admins.values())

    // 應用過濾器
    if (filters.status) {
      results = results.filter((a) => a.status === filters.status)
    }
    if (filters.isSuper !== undefined) {
      results = results.filter((a) => a.isSuper === filters.isSuper)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      results = results.filter(
        (a) => a.name.toLowerCase().includes(search) || a.email.value.includes(search)
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

  async delete(id: string): Promise<void> {
    this.admins.delete(id)
  }

  async exists(email: string): Promise<boolean> {
    for (const admin of this.admins.values()) {
      if (admin.email.value === email) {
        return true
      }
    }
    return false
  }
}

/**
 * 實際的 Atlas ORM 實作
 * 這是佔位符實現，生產環境應使用真實的 ORM 操作
 */
export class AtlasAdminRepository implements IAdminRepository {
  constructor(
    // @ts-expect-error TS6138
    private readonly _db: any // @gravito/atlas Database instance
  ) {}

  async save(_admin: Admin): Promise<void> {
    // 實際實作應使用 Atlas query builder
    // await this._db.table('admins').upsert({ ... })
  }

  async findById(_id: string): Promise<Admin | null> {
    // 實際實作
    return null
  }

  async findByEmail(_email: string): Promise<Admin | null> {
    // 實際實作
    return null
  }

  async findByPasswordResetToken(_token: string): Promise<Admin | null> {
    // 實際實作
    return null
  }

  async findWithPagination(
    _filters: AdminFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Admin>> {
    // 實際實作
    return {
      items: [],
      total: 0,
      page: options.page,
      limit: options.limit,
    }
  }

  async delete(_id: string): Promise<void> {
    // 實際實作
  }

  async exists(_email: string): Promise<boolean> {
    // 實際實作
    return false
  }
}

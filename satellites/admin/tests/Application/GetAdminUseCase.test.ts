import { beforeEach, describe, expect, it } from 'bun:test'
import { GetAdminUseCase } from '../../src/Application/UseCases/GetAdmin'
import type {
  AdminFilters,
  IAdminRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../src/Domain/Contracts/IAdminRepository'
import { Admin } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'

// InMemory AdminRepository
class InMemoryAdminRepository implements IAdminRepository {
  private admins = new Map<string, Admin>()

  async save(admin: Admin): Promise<void> {
    this.admins.set(admin.id, admin)
  }

  async findById(id: string): Promise<Admin | null> {
    return this.admins.get(id) ?? null
  }

  async findByEmail(email: string): Promise<Admin | null> {
    for (const admin of this.admins.values()) {
      if (admin.email.value === email) return admin
    }
    return null
  }

  async findByPasswordResetToken(_token: string): Promise<Admin | null> {
    return null
  }

  async findWithPagination(
    _filters: AdminFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Admin>> {
    return { items: [], total: 0, page: options.page, limit: options.limit }
  }

  async delete(id: string): Promise<void> {
    this.admins.delete(id)
  }

  async exists(email: string): Promise<boolean> {
    for (const admin of this.admins.values()) {
      if (admin.email.value === email) return true
    }
    return false
  }

  seed(admin: Admin): void {
    this.admins.set(admin.id, admin)
  }
}

describe('GetAdminUseCase', () => {
  let repo: InMemoryAdminRepository
  let useCase: GetAdminUseCase

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
    useCase = new GetAdminUseCase(repo)
  })

  it('依 ID 回傳 admin DTO', async () => {
    const email = AdminEmail.create('get@test.com')
    const admin = Admin.create('get-admin-1', email, 'Get Admin', 'hashed-pw', {
      isSuper: true,
    })
    repo.seed(admin)

    const result = await useCase.execute('get-admin-1')

    expect(result.id).toBe('get-admin-1')
    expect(result.email).toBe('get@test.com')
    expect(result.name).toBe('Get Admin')
    expect(result.isSuper).toBe(true)
    expect(result.status).toBe('active')
    expect(result.createdAt).toBeDefined()
    // 確認不會洩漏 passwordHash
    expect((result as Record<string, unknown>).passwordHash).toBeUndefined()
  })
})

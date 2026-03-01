import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { UpdateAdminUseCase } from '../../src/Application/UseCases/UpdateAdmin'
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

describe('UpdateAdminUseCase', () => {
  let repo: InMemoryAdminRepository
  let core: PlanetCore
  let useCase: UpdateAdminUseCase

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
    core = createMockCore()
    useCase = new UpdateAdminUseCase(repo, core)
  })

  it('成功更新管理員資料', async () => {
    const email = AdminEmail.create('update@test.com')
    const admin = Admin.create('update-admin', email, 'Old Name', 'hashed-pw')
    repo.seed(admin)

    const result = await useCase.execute('update-admin', 'New Name', {
      department: 'Engineering',
    })

    expect(result.id).toBe('update-admin')
    expect(result.name).toBe('New Name')
    expect(result.email).toBe('update@test.com')
    expect(result.updatedAt).toBeDefined()
  })
})

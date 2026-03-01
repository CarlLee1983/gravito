import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { CreateAdminUseCase } from '../../src/Application/UseCases/CreateAdmin'
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

// 建立超級管理員
function createSuperAdmin(): Admin {
  const email = AdminEmail.create('super@test.com')
  return Admin.create('super-admin', email, 'Super Admin', 'hashed-pw', {
    isSuper: true,
  })
}

// 建立一般管理員
function createNormalAdmin(): Admin {
  const email = AdminEmail.create('normal@test.com')
  return Admin.create('normal-admin', email, 'Normal Admin', 'hashed-pw', {
    isSuper: false,
  })
}

describe('CreateAdminUseCase', () => {
  let repo: InMemoryAdminRepository
  let core: PlanetCore
  let useCase: CreateAdminUseCase

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
    core = createMockCore()
    useCase = new CreateAdminUseCase(repo, core)
  })

  it('超級管理員可以建立新管理員', async () => {
    const superAdmin = createSuperAdmin()

    const result = await useCase.execute(
      'newadmin@test.com',
      'New Admin',
      'new-password-hash',
      superAdmin
    )

    expect(result.email).toBe('newadmin@test.com')
    expect(result.name).toBe('New Admin')
    expect(result.status).toBe('active')
    expect(result.isSuper).toBe(false)
    expect(result.id).toBeDefined()
    expect(result.createdAt).toBeDefined()
  })

  it('非超級管理員無法建立', async () => {
    const normalAdmin = createNormalAdmin()

    await expect(
      useCase.execute('newadmin@test.com', 'New Admin', 'new-password-hash', normalAdmin)
    ).rejects.toThrow('Access forbidden')
  })
})

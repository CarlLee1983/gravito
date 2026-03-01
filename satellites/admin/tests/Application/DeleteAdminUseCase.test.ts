import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { DeleteAdminUseCase } from '../../src/Application/UseCases/DeleteAdmin'
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

  getAll(): Admin[] {
    return Array.from(this.admins.values())
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

describe('DeleteAdminUseCase', () => {
  let repo: InMemoryAdminRepository
  let core: PlanetCore
  let useCase: DeleteAdminUseCase

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
    core = createMockCore()
    useCase = new DeleteAdminUseCase(repo, core)
  })

  it('成功刪除管理員', async () => {
    // 建立超級管理員（請求者）
    const superEmail = AdminEmail.create('super@test.com')
    const superAdmin = Admin.create('super-admin', superEmail, 'Super', 'pw', {
      isSuper: true,
    })

    // 建立目標管理員
    const targetEmail = AdminEmail.create('target@test.com')
    const targetAdmin = Admin.create('target-admin', targetEmail, 'Target', 'pw')
    repo.seed(targetAdmin)

    // 確認刪除前存在
    const before = await repo.findById('target-admin')
    expect(before).not.toBeNull()

    // 執行刪除
    await useCase.execute('target-admin', superAdmin)

    // 確認刪除後不存在
    const after = await repo.findById('target-admin')
    expect(after).toBeNull()
  })
})

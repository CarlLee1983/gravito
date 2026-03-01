import { beforeEach, describe, expect, it } from 'bun:test'
import { Admin } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { InMemoryAdminRepository } from '../../src/Infrastructure/Persistence/AtlasAdminRepository'

// 建立測試用 Admin helper
function createTestAdmin(overrides?: {
  id?: string
  email?: string
  name?: string
  passwordHash?: string
  isSuper?: boolean
}): Admin {
  const email = AdminEmail.create(overrides?.email ?? 'admin@test.com')
  return Admin.create(
    overrides?.id ?? 'admin-1',
    email,
    overrides?.name ?? 'Test Admin',
    overrides?.passwordHash ?? 'hashed-password',
    { isSuper: overrides?.isSuper ?? false }
  )
}

describe('InMemoryAdminRepository', () => {
  let repo: InMemoryAdminRepository

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
  })

  it('should save and retrieve admin by ID', async () => {
    // Arrange
    const admin = createTestAdmin({
      id: 'repo-admin-1',
      email: 'repo@test.com',
      name: 'Repo Admin',
    })

    // Act
    await repo.save(admin)
    const found = await repo.findById('repo-admin-1')

    // Assert
    expect(found).not.toBeNull()
    expect(found!.id).toBe('repo-admin-1')
    expect(found!.email.value).toBe('repo@test.com')
    expect(found!.name).toBe('Repo Admin')

    // 不存在的 ID 回傳 null
    const notFound = await repo.findById('non-existent')
    expect(notFound).toBeNull()
  })

  it('should findByEmail() and exists() work correctly', async () => {
    // Arrange
    const admin1 = createTestAdmin({
      id: 'repo-admin-2',
      email: 'alice@test.com',
      name: 'Alice',
    })
    const admin2 = createTestAdmin({
      id: 'repo-admin-3',
      email: 'bob@test.com',
      name: 'Bob',
    })

    await repo.save(admin1)
    await repo.save(admin2)

    // Act & Assert - findByEmail
    const foundAlice = await repo.findByEmail('alice@test.com')
    expect(foundAlice).not.toBeNull()
    expect(foundAlice!.name).toBe('Alice')

    const foundBob = await repo.findByEmail('bob@test.com')
    expect(foundBob).not.toBeNull()
    expect(foundBob!.name).toBe('Bob')

    const notFound = await repo.findByEmail('nobody@test.com')
    expect(notFound).toBeNull()

    // Act & Assert - exists
    const aliceExists = await repo.exists('alice@test.com')
    expect(aliceExists).toBe(true)

    const nobodyExists = await repo.exists('nobody@test.com')
    expect(nobodyExists).toBe(false)
  })
})

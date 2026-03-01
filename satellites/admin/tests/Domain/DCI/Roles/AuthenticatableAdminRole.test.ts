import { describe, expect, it } from 'bun:test'
import { AdminErrorFactory } from '../../../../src/Application/Errors/AdminError'
import type { IAdminRepository } from '../../../../src/Domain/Contracts/IAdminRepository'
import {
  type AuthenticatableAdminRole,
  injectAuthenticatableAdminRole,
} from '../../../../src/Domain/DCI/Roles/AuthenticatableAdminRole'
import { Admin, AdminStatus } from '../../../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../../../src/Domain/ValueObjects/AdminEmail'

function createTestAdmin(overrides?: {
  status?: AdminStatus
  isSuper?: boolean
  passwordHash?: string
}): Admin {
  const email = AdminEmail.create('auth@test.com')
  const admin = Admin.create(
    'admin-1',
    email,
    'Auth Admin',
    overrides?.passwordHash ?? 'hashed-password',
    { isSuper: overrides?.isSuper ?? false }
  )

  if (overrides?.status === AdminStatus.SUSPENDED) {
    admin.suspend()
  }

  return admin
}

// Mock IAdminRepository
class MockAdminRepository implements IAdminRepository {
  private saveCount = 0

  async save(): Promise<void> {
    this.saveCount++
  }

  async findByEmail(): Promise<Admin | null> {
    return null
  }

  async findById(): Promise<Admin | null> {
    return null
  }

  async exists(): Promise<boolean> {
    return false
  }

  async delete(): Promise<void> {}

  async list(): Promise<Admin[]> {
    return []
  }

  getSaveCount(): number {
    return this.saveCount
  }
}

describe('AuthenticatableAdminRole (inject function)', () => {
  it('should verify password and return true on match', () => {
    const admin = createTestAdmin({ passwordHash: 'correct-hash' })
    const repo = new MockAdminRepository()
    const role = injectAuthenticatableAdminRole(admin, repo)

    // Password matches
    const result = role.verifyPassword('correct-hash')
    expect(result).toBe(true)
  })

  it('should throw InvalidCredentialsError on password mismatch', () => {
    const admin = createTestAdmin({ passwordHash: 'correct-hash' })
    const repo = new MockAdminRepository()
    const role = injectAuthenticatableAdminRole(admin, repo)

    // Password doesn't match
    expect(() => role.verifyPassword('wrong-hash')).toThrow()
  })

  it('should return true for active admin status', () => {
    const admin = createTestAdmin({ status: AdminStatus.ACTIVE })
    const repo = new MockAdminRepository()
    const role = injectAuthenticatableAdminRole(admin, repo)

    const result = role.isActive()
    expect(result).toBe(true)
  })

  it('should throw AdminInactiveError for suspended admin', () => {
    const admin = createTestAdmin({ status: AdminStatus.SUSPENDED })
    const repo = new MockAdminRepository()
    const role = injectAuthenticatableAdminRole(admin, repo)

    expect(() => role.isActive()).toThrow()
  })

  it('should throw AdminInactiveError for inactive admin', () => {
    const admin = createTestAdmin()
    admin.deactivate()
    const repo = new MockAdminRepository()
    const role = injectAuthenticatableAdminRole(admin, repo)

    expect(() => role.isActive()).toThrow()
  })

  it('should record login and persist to repository', async () => {
    const admin = createTestAdmin()
    const repo = new MockAdminRepository()
    const role = injectAuthenticatableAdminRole(admin, repo)

    expect(admin.lastLoginAt).toBeUndefined()

    await role.recordLogin(repo)

    expect(admin.lastLoginAt).toBeInstanceOf(Date)
    expect(repo.getSaveCount()).toBe(1)
  })

  it('should work complete auth flow: verify -> check active -> record login', async () => {
    const admin = createTestAdmin({ passwordHash: 'secret' })
    const repo = new MockAdminRepository()
    const role = injectAuthenticatableAdminRole(admin, repo)

    // 1. Verify password
    role.verifyPassword('secret')

    // 2. Check status
    role.isActive()

    // 3. Record login
    await role.recordLogin(repo)

    expect(admin.lastLoginAt).toBeInstanceOf(Date)
    expect(repo.getSaveCount()).toBe(1)
  })
})

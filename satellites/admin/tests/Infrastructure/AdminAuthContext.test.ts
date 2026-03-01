import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { AdminError } from '../../src/Application/Errors/AdminError'
import { AdminAuthContext } from '../../src/Domain/DCI/Contexts/AdminAuthContext'
import { Admin, AdminStatus } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { InMemoryAdminRepository } from '../../src/Infrastructure/Persistence/AtlasAdminRepository'

// 建立 mock PlanetCore
function createMockCore(): PlanetCore {
  return {
    hooks: {
      doAction: mock(() => Promise.resolve()),
    },
  } as unknown as PlanetCore
}

// 建立測試用 Admin helper
function createTestAdmin(overrides?: {
  id?: string
  email?: string
  name?: string
  passwordHash?: string
  isSuper?: boolean
  status?: AdminStatus
}): Admin {
  const email = AdminEmail.create(overrides?.email ?? 'admin@test.com')
  const admin = Admin.create(
    overrides?.id ?? 'admin-1',
    email,
    overrides?.name ?? 'Test Admin',
    overrides?.passwordHash ?? 'correct-password',
    { isSuper: overrides?.isSuper ?? false }
  )

  // 如果需要非 ACTIVE 狀態，透過 entity 方法設定
  if (overrides?.status === AdminStatus.SUSPENDED) {
    admin.suspend()
  }
  if (overrides?.status === AdminStatus.INACTIVE) {
    admin.deactivate()
  }

  return admin
}

describe('AdminAuthContext', () => {
  let adminRepo: InMemoryAdminRepository
  let core: PlanetCore
  let authContext: AdminAuthContext

  beforeEach(() => {
    adminRepo = new InMemoryAdminRepository()
    core = createMockCore()
    authContext = new AdminAuthContext(adminRepo, core)
  })

  it('should authenticate successfully with valid credentials', async () => {
    // Arrange
    const admin = createTestAdmin({
      id: 'admin-auth-1',
      email: 'valid@test.com',
      passwordHash: 'my-password',
    })
    await adminRepo.save(admin)

    // Act
    const result = await authContext.authenticate('valid@test.com', 'my-password')

    // Assert
    expect(result.admin.id).toBe('admin-auth-1')
    expect(result.admin.email.value).toBe('valid@test.com')
    expect(result.accessToken).toContain('access_')
    expect(result.refreshToken).toContain('refresh_')
  })

  it('should fail authentication with invalid credentials (wrong password)', async () => {
    // Arrange
    const admin = createTestAdmin({
      id: 'admin-auth-2',
      email: 'user@test.com',
      passwordHash: 'correct-password',
    })
    await adminRepo.save(admin)

    // Act & Assert
    await expect(authContext.authenticate('user@test.com', 'wrong-password')).rejects.toThrow()

    try {
      await authContext.authenticate('user@test.com', 'wrong-password')
    } catch (error) {
      expect(error).toBeInstanceOf(AdminError)
      expect((error as AdminError).code).toBe('INVALID_CREDENTIALS')
    }
  })

  it('should fail authentication if admin is inactive (suspended)', async () => {
    // Arrange - 建立一個非 super admin 再停用
    const admin = createTestAdmin({
      id: 'admin-auth-3',
      email: 'suspended@test.com',
      passwordHash: 'my-password',
      isSuper: false,
    })
    admin.suspend()
    await adminRepo.save(admin)

    // Act & Assert
    try {
      await authContext.authenticate('suspended@test.com', 'my-password')
      expect(true).toBe(false) // 不應走到這裡
    } catch (error) {
      expect(error).toBeInstanceOf(AdminError)
      expect((error as AdminError).code).toBe('ADMIN_INACTIVE')
    }
  })

  it('should update last_login_at via recordLogin()', async () => {
    // Arrange
    const admin = createTestAdmin({
      id: 'admin-auth-4',
      email: 'login@test.com',
      passwordHash: 'my-password',
    })
    expect(admin.lastLoginAt).toBeUndefined()
    await adminRepo.save(admin)

    // Act
    await authContext.authenticate('login@test.com', 'my-password')

    // Assert - 從 repo 重新取得以驗證持久化
    const savedAdmin = await adminRepo.findById('admin-auth-4')
    expect(savedAdmin).not.toBeNull()
    expect(savedAdmin!.lastLoginAt).toBeInstanceOf(Date)
  })

  it('should emit admin:authenticated hook after successful login', async () => {
    // Arrange
    const admin = createTestAdmin({
      id: 'admin-auth-5',
      email: 'hook@test.com',
      passwordHash: 'my-password',
      isSuper: true,
    })
    await adminRepo.save(admin)

    // Act
    await authContext.authenticate('hook@test.com', 'my-password')

    // Assert
    const doAction = core.hooks.doAction as ReturnType<typeof mock>
    expect(doAction).toHaveBeenCalledTimes(1)
    expect(doAction).toHaveBeenCalledWith('admin:authenticated', {
      adminId: 'admin-auth-5',
      email: 'hook@test.com',
      isSuper: true,
    })
  })
})

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { AdminError } from '../../src/Application/Errors/AdminError'
import { AdminManagementContext } from '../../src/Domain/DCI/Contexts/AdminManagementContext'
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

describe('AdminManagementContext', () => {
  let adminRepo: InMemoryAdminRepository
  let core: PlanetCore
  let mgmtContext: AdminManagementContext

  beforeEach(() => {
    adminRepo = new InMemoryAdminRepository()
    core = createMockCore()
    mgmtContext = new AdminManagementContext(adminRepo, core)
  })

  describe('createAdmin()', () => {
    it('should create admin by super admin successfully', async () => {
      // Arrange
      const superAdmin = createTestAdmin({
        id: 'super-1',
        email: 'super@test.com',
        isSuper: true,
      })

      const newAdminEmail = AdminEmail.create('new@test.com')

      // Act
      const created = await mgmtContext.createAdmin(
        newAdminEmail,
        'New Admin',
        'new-password-hash',
        superAdmin
      )

      // Assert
      expect(created.email.value).toBe('new@test.com')
      expect(created.name).toBe('New Admin')
      expect(created.status).toBe(AdminStatus.ACTIVE)
      expect(created.isSuper).toBe(false)
      expect(created.createdBy).toBe('super-1')

      // 驗證已持久化
      const saved = await adminRepo.findByEmail('new@test.com')
      expect(saved).not.toBeNull()
      expect(saved!.name).toBe('New Admin')
    })

    it('should fail when non-super admin tries to create admin', async () => {
      // Arrange
      const normalAdmin = createTestAdmin({
        id: 'normal-1',
        email: 'normal@test.com',
        isSuper: false,
      })

      const newAdminEmail = AdminEmail.create('new@test.com')

      // Act & Assert
      try {
        await mgmtContext.createAdmin(newAdminEmail, 'New Admin', 'password-hash', normalAdmin)
        expect(true).toBe(false) // 不應走到這裡
      } catch (error) {
        expect(error).toBeInstanceOf(AdminError)
        expect((error as AdminError).code).toBe('FORBIDDEN')
      }
    })
  })

  describe('suspendAdmin()', () => {
    it('should suspend admin and update status', async () => {
      // Arrange
      const superAdmin = createTestAdmin({
        id: 'super-1',
        email: 'super@test.com',
        isSuper: true,
      })

      const targetAdmin = createTestAdmin({
        id: 'target-1',
        email: 'target@test.com',
        isSuper: false,
      })
      await adminRepo.save(targetAdmin)

      // Act
      const suspended = await mgmtContext.suspendAdmin('target-1', superAdmin)

      // Assert
      expect(suspended.status).toBe(AdminStatus.SUSPENDED)
      expect(suspended.isActive).toBe(false)

      // 驗證持久化
      const saved = await adminRepo.findById('target-1')
      expect(saved!.status).toBe(AdminStatus.SUSPENDED)
    })
  })

  describe('activateAdmin()', () => {
    it('should restore admin to active status', async () => {
      // Arrange
      const targetAdmin = createTestAdmin({
        id: 'target-2',
        email: 'target2@test.com',
        isSuper: false,
      })
      targetAdmin.suspend()
      await adminRepo.save(targetAdmin)
      expect(targetAdmin.status).toBe(AdminStatus.SUSPENDED)

      // Act
      const activated = await mgmtContext.activateAdmin('target-2')

      // Assert
      expect(activated.status).toBe(AdminStatus.ACTIVE)
      expect(activated.isActive).toBe(true)

      // 驗證持久化
      const saved = await adminRepo.findById('target-2')
      expect(saved!.status).toBe(AdminStatus.ACTIVE)
    })
  })

  describe('hooks', () => {
    it('should emit admin:created hook after creating admin', async () => {
      // Arrange
      const superAdmin = createTestAdmin({
        id: 'super-1',
        email: 'super@test.com',
        isSuper: true,
      })

      const newAdminEmail = AdminEmail.create('created@test.com')

      // Act
      const created = await mgmtContext.createAdmin(
        newAdminEmail,
        'Created Admin',
        'password-hash',
        superAdmin,
        { isSuper: false }
      )

      // Assert
      const doAction = core.hooks.doAction as ReturnType<typeof mock>
      expect(doAction).toHaveBeenCalledTimes(1)
      expect(doAction).toHaveBeenCalledWith('admin:created', {
        adminId: created.id,
        email: 'created@test.com',
        isSuper: false,
        createdBy: 'super-1',
      })
    })
  })
})

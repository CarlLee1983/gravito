import { describe, expect, it } from 'bun:test'
import { Admin, AdminStatus } from '../../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../../src/Domain/ValueObjects/AdminEmail'

// 建立測試用 helper
function createTestAdmin(overrides?: {
  id?: string
  email?: string
  name?: string
  passwordHash?: string
  isSuper?: boolean
  createdBy?: string
}): Admin {
  const email = AdminEmail.create(overrides?.email ?? 'admin@test.com')
  return Admin.create(
    overrides?.id ?? 'admin-1',
    email,
    overrides?.name ?? 'Test Admin',
    overrides?.passwordHash ?? 'hashed-password',
    {
      isSuper: overrides?.isSuper ?? false,
      createdBy: overrides?.createdBy,
    }
  )
}

describe('Admin Entity', () => {
  describe('create() static factory', () => {
    it('should create admin with default values', () => {
      const email = AdminEmail.create('admin@test.com')
      const admin = Admin.create('admin-1', email, 'Test Admin', 'hashed-pw')

      expect(admin.id).toBe('admin-1')
      expect(admin.email.equals(email)).toBe(true)
      expect(admin.name).toBe('Test Admin')
      expect(admin.passwordHash).toBe('hashed-pw')
      expect(admin.status).toBe(AdminStatus.ACTIVE)
      expect(admin.isSuper).toBe(false)
      expect(admin.isActive).toBe(true)
      expect(admin.createdAt).toBeInstanceOf(Date)
    })

    it('should create super admin with isSuper option', () => {
      const admin = createTestAdmin({ isSuper: true })

      expect(admin.isSuper).toBe(true)
      expect(admin.status).toBe(AdminStatus.ACTIVE)
    })

    it('should record createdBy when provided', () => {
      const admin = createTestAdmin({ createdBy: 'creator-1' })

      expect(admin.createdBy).toBe('creator-1')
    })
  })

  describe('reconstitute() static factory', () => {
    it('should reconstitute admin from props', () => {
      const email = AdminEmail.reconstitute('stored@db.com')
      const createdAt = new Date('2025-01-01')
      const updatedAt = new Date('2025-06-01')

      const admin = Admin.reconstitute('admin-2', {
        email,
        name: 'Restored Admin',
        passwordHash: 'hash-from-db',
        status: AdminStatus.SUSPENDED,
        isSuper: false,
        lastLoginAt: new Date('2025-05-01'),
        createdAt,
        updatedAt,
        metadata: { role: 'editor' },
      })

      expect(admin.id).toBe('admin-2')
      expect(admin.name).toBe('Restored Admin')
      expect(admin.status).toBe(AdminStatus.SUSPENDED)
      expect(admin.isActive).toBe(false)
      expect(admin.lastLoginAt).toBeInstanceOf(Date)
      expect(admin.createdAt).toBe(createdAt)
      expect(admin.updatedAt).toBe(updatedAt)
      expect(admin.metadata).toEqual({ role: 'editor' })
    })
  })

  describe('getters', () => {
    it('should expose all properties via getters', () => {
      const admin = createTestAdmin({
        id: 'g-1',
        email: 'getter@test.com',
        name: 'Getter Admin',
        passwordHash: 'pw-hash',
        isSuper: true,
      })

      expect(admin.id).toBe('g-1')
      expect(admin.email.value).toBe('getter@test.com')
      expect(admin.name).toBe('Getter Admin')
      expect(admin.passwordHash).toBe('pw-hash')
      expect(admin.status).toBe(AdminStatus.ACTIVE)
      expect(admin.isSuper).toBe(true)
      expect(admin.isActive).toBe(true)
      expect(admin.lastLoginAt).toBeUndefined()
      expect(admin.passwordResetToken).toBeUndefined()
      expect(admin.passwordResetExpiresAt).toBeUndefined()
      expect(admin.updatedAt).toBeUndefined()
      expect(admin.metadata).toEqual({})
    })
  })

  describe('suspend()', () => {
    it('should suspend a normal admin', () => {
      const admin = createTestAdmin()

      admin.suspend()

      expect(admin.status).toBe(AdminStatus.SUSPENDED)
      expect(admin.isActive).toBe(false)
      expect(admin.updatedAt).toBeInstanceOf(Date)
    })

    it('should throw when suspending super admin', () => {
      const admin = createTestAdmin({ isSuper: true })

      expect(() => admin.suspend()).toThrow('Cannot suspend super admin')
    })
  })

  describe('activate()', () => {
    it('should activate a suspended admin', () => {
      const admin = createTestAdmin()
      admin.suspend()
      expect(admin.status).toBe(AdminStatus.SUSPENDED)

      admin.activate()

      expect(admin.status).toBe(AdminStatus.ACTIVE)
      expect(admin.isActive).toBe(true)
      expect(admin.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('recordLogin()', () => {
    it('should update lastLoginAt timestamp', () => {
      const admin = createTestAdmin()
      expect(admin.lastLoginAt).toBeUndefined()

      admin.recordLogin()

      expect(admin.lastLoginAt).toBeInstanceOf(Date)
      expect(admin.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('changePassword()', () => {
    it('should update password hash and clear reset token', () => {
      const admin = createTestAdmin()
      const future = new Date(Date.now() + 3600000)
      admin.setPasswordReset('reset-token-123', future)
      expect(admin.passwordResetToken).toBe('reset-token-123')

      admin.changePassword('new-hashed-password')

      expect(admin.passwordHash).toBe('new-hashed-password')
      expect(admin.passwordResetToken).toBeUndefined()
      expect(admin.passwordResetExpiresAt).toBeUndefined()
      expect(admin.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('setPasswordReset() / clearPasswordReset()', () => {
    it('should set and clear password reset token', () => {
      const admin = createTestAdmin()
      const expiresAt = new Date(Date.now() + 3600000)

      admin.setPasswordReset('token-abc', expiresAt)

      expect(admin.passwordResetToken).toBe('token-abc')
      expect(admin.passwordResetExpiresAt).toBe(expiresAt)
      expect(admin.updatedAt).toBeInstanceOf(Date)

      admin.clearPasswordReset()

      expect(admin.passwordResetToken).toBeUndefined()
      expect(admin.passwordResetExpiresAt).toBeUndefined()
    })
  })

  describe('updateProfile()', () => {
    it('should update name and metadata', () => {
      const admin = createTestAdmin({ name: 'Old Name' })

      admin.updateProfile('New Name', { department: 'Engineering' })

      expect(admin.name).toBe('New Name')
      expect(admin.metadata).toEqual({ department: 'Engineering' })
      expect(admin.updatedAt).toBeInstanceOf(Date)
    })

    it('should update name only when metadata is not provided', () => {
      const admin = createTestAdmin({ name: 'Old Name' })

      admin.updateProfile('Updated Name')

      expect(admin.name).toBe('Updated Name')
      expect(admin.metadata).toEqual({})
    })
  })
})

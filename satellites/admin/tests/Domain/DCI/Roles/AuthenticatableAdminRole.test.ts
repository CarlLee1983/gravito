import { describe, expect, it } from 'bun:test'
import { AuthenticatableAdminRole } from '../../../../src/Domain/DCI/Roles/AuthenticatableAdminRole'
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

describe('AuthenticatableAdminRole', () => {
  it('should return correct active status', () => {
    const activeAdmin = createTestAdmin()
    const activeRole = new AuthenticatableAdminRole(activeAdmin)
    expect(activeRole.isActive()).toBe(true)

    const suspendedAdmin = createTestAdmin({ status: AdminStatus.SUSPENDED })
    const suspendedRole = new AuthenticatableAdminRole(suspendedAdmin)
    expect(suspendedRole.isActive()).toBe(false)
  })

  it('should verify password asynchronously', async () => {
    const admin = createTestAdmin({ passwordHash: 'correct-hash' })
    const role = new AuthenticatableAdminRole(admin)

    const matchResult = await role.verifyPassword('correct-hash')
    expect(matchResult).toBe(true)

    const noMatchResult = await role.verifyPassword('wrong-hash')
    expect(noMatchResult).toBe(false)
  })

  it('should delegate recordLogin to admin entity', () => {
    const admin = createTestAdmin()
    const role = new AuthenticatableAdminRole(admin)

    expect(admin.lastLoginAt).toBeUndefined()

    role.recordLogin()

    expect(admin.lastLoginAt).toBeInstanceOf(Date)
  })
})

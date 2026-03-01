import { describe, expect, it } from 'bun:test'
import { injectAdminManagerRole } from '../../../../src/Domain/DCI/Roles/AdminManagerRole'
import { Admin } from '../../../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../../../src/Domain/ValueObjects/AdminEmail'

function createAdmin(id: string, isSuper: boolean): Admin {
  const email = AdminEmail.create(`${id}@test.com`)
  return Admin.create(id, email, `Admin ${id}`, 'hash', { isSuper })
}

describe('AdminManagerRole (inject function)', () => {
  describe('assertCanManage()', () => {
    it('should allow managing normal admin', () => {
      const superAdmin = createAdmin('super-1', true)
      const normalAdmin = createAdmin('normal-1', false)

      const role = injectAdminManagerRole(superAdmin)

      // 應該不 throw
      expect(() => role.assertCanManage(normalAdmin)).not.toThrow()
    })

    it('should throw when managing super admin', () => {
      const superAdmin = createAdmin('super-1', true)
      const targetSuper = createAdmin('super-2', true)

      const role = injectAdminManagerRole(superAdmin)

      // 不可管理超級管理員
      expect(() => role.assertCanManage(targetSuper)).toThrow()
    })
  })

  describe('assertCanCreate()', () => {
    it('should allow super admin to create normal admin', () => {
      const superAdmin = createAdmin('super-1', true)
      const role = injectAdminManagerRole(superAdmin)

      // 應該不 throw
      expect(() => role.assertCanCreate()).not.toThrow()
    })

    it('should allow super admin to create super admin', () => {
      const superAdmin = createAdmin('super-1', true)
      const role = injectAdminManagerRole(superAdmin)

      // 應該不 throw
      expect(() => role.assertCanCreate()).not.toThrow()
    })

    it('should throw when normal admin tries to create admin', () => {
      const normalAdmin = createAdmin('normal-1', false)
      const role = injectAdminManagerRole(normalAdmin)

      // 非超級管理員無法建立任何管理員
      expect(() => role.assertCanCreate()).toThrow()
    })
  })

  describe('assertCanSuspend()', () => {
    it('should allow super admin to suspend normal admin', () => {
      const superAdmin = createAdmin('super-1', true)
      const normalAdmin = createAdmin('normal-1', false)
      const role = injectAdminManagerRole(superAdmin)

      // 應該不 throw
      expect(() => role.assertCanSuspend(normalAdmin)).not.toThrow()
    })

    it('should throw when super admin tries to suspend super admin', () => {
      const superAdmin = createAdmin('super-1', true)
      const targetSuper = createAdmin('super-2', true)
      const role = injectAdminManagerRole(superAdmin)

      // 不可停用超級管理員
      expect(() => role.assertCanSuspend(targetSuper)).toThrow()
    })

    it('should throw when normal admin tries to suspend anyone', () => {
      const normalAdmin = createAdmin('normal-1', false)
      const targetNormal = createAdmin('normal-2', false)
      const role = injectAdminManagerRole(normalAdmin)

      // 非超級管理員無法停用任何人
      expect(() => role.assertCanSuspend(targetNormal)).toThrow()
    })
  })

  describe('assertCanUpdate()', () => {
    it('should allow super admin to update any admin', () => {
      const superAdmin = createAdmin('super-1', true)
      const otherAdmin = createAdmin('other-1', false)
      const role = injectAdminManagerRole(superAdmin)

      // 應該不 throw
      expect(() => role.assertCanUpdate(otherAdmin)).not.toThrow()
    })

    it('should allow normal admin to update self', () => {
      const normalAdmin = createAdmin('normal-1', false)
      const role = injectAdminManagerRole(normalAdmin)

      // 應該不 throw
      expect(() => role.assertCanUpdate(normalAdmin)).not.toThrow()
    })

    it('should throw when normal admin tries to update another admin', () => {
      const normalAdmin = createAdmin('normal-1', false)
      const otherAdmin = createAdmin('normal-2', false)
      const role = injectAdminManagerRole(normalAdmin)

      // 非超級管理員無法更新他人
      expect(() => role.assertCanUpdate(otherAdmin)).toThrow()
    })
  })

  describe('assertCanDelete()', () => {
    it('should allow super admin to delete normal admin', () => {
      const superAdmin = createAdmin('super-1', true)
      const normalAdmin = createAdmin('normal-1', false)
      const role = injectAdminManagerRole(superAdmin)

      // 應該不 throw
      expect(() => role.assertCanDelete(normalAdmin)).not.toThrow()
    })

    it('should throw when super admin tries to delete super admin', () => {
      const superAdmin = createAdmin('super-1', true)
      const targetSuper = createAdmin('super-2', true)
      const role = injectAdminManagerRole(superAdmin)

      // 不可刪除超級管理員
      expect(() => role.assertCanDelete(targetSuper)).toThrow()
    })

    it('should throw when normal admin tries to delete anyone', () => {
      const normalAdmin = createAdmin('normal-1', false)
      const otherAdmin = createAdmin('normal-2', false)
      const role = injectAdminManagerRole(normalAdmin)

      // 非超級管理員無法刪除任何人
      expect(() => role.assertCanDelete(otherAdmin)).toThrow()
    })
  })
})

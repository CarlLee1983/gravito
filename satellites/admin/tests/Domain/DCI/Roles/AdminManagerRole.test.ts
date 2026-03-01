import { describe, expect, it } from 'bun:test'
import { AdminManagerRole } from '../../../../src/Domain/DCI/Roles/AdminManagerRole'
import { Admin } from '../../../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../../../src/Domain/ValueObjects/AdminEmail'

function createAdmin(id: string, isSuper: boolean): Admin {
  const email = AdminEmail.create(`${id}@test.com`)
  return Admin.create(id, email, `Admin ${id}`, 'hash', { isSuper })
}

describe('AdminManagerRole', () => {
  it('should allow manage only for super admin', () => {
    const superAdmin = createAdmin('super-1', true)
    const normalAdmin = createAdmin('normal-1', false)

    const superRole = new AdminManagerRole(superAdmin)
    const normalRole = new AdminManagerRole(normalAdmin)

    expect(superRole.canManage()).toBe(true)
    expect(normalRole.canManage()).toBe(false)
  })

  it('should prevent deleting super admin', () => {
    const superAdmin = createAdmin('super-1', true)
    const targetSuper = createAdmin('super-2', true)
    const targetNormal = createAdmin('normal-1', false)

    const role = new AdminManagerRole(superAdmin)

    // 不能刪除超級管理員
    expect(role.canDelete(targetSuper)).toBe(false)
    // 可以刪除普通管理員
    expect(role.canDelete(targetNormal)).toBe(true)

    // 非超級管理員不能刪除任何人
    const normalRole = new AdminManagerRole(targetNormal)
    expect(normalRole.canDelete(targetSuper)).toBe(false)
    expect(normalRole.canDelete(createAdmin('other', false))).toBe(false)
  })
})

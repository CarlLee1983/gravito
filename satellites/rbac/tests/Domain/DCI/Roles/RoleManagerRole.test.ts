import { describe, expect, it } from 'bun:test'
import { RoleManagerRole } from '../../../../src/Domain/DCI/Roles/RoleManagerRole'
import { Role } from '../../../../src/Domain/Entities/Role'

describe('RoleManagerRole', () => {
  it('should allow create only for super admin', () => {
    const superRole = new RoleManagerRole({ isSuper: true })
    const normalRole = new RoleManagerRole({ isSuper: false })

    expect(superRole.canCreate()).toBe(true)
    expect(normalRole.canCreate()).toBe(false)
  })

  it('should prevent system role updates', () => {
    const managerRole = new RoleManagerRole({ isSuper: true })
    const normalManagerRole = new RoleManagerRole({ isSuper: false })

    const systemRole = Role.create('role-sys', {
      name: 'system_admin',
      displayName: 'System Admin',
      isSystem: true,
    })
    const customRole = Role.create('role-custom', {
      name: 'editor',
      displayName: 'Editor',
      isSystem: false,
    })

    // 超級管理員也不能更新系統角色
    expect(managerRole.canUpdate(systemRole)).toBe(false)
    // 超級管理員可以更新自訂角色
    expect(managerRole.canUpdate(customRole)).toBe(true)
    // 非超級管理員不能更新任何角色
    expect(normalManagerRole.canUpdate(customRole)).toBe(false)
  })

  it('should prevent system role deletion', () => {
    const managerRole = new RoleManagerRole({ isSuper: true })
    const normalManagerRole = new RoleManagerRole({ isSuper: false })

    const systemRole = Role.create('role-sys', {
      name: 'system_admin',
      displayName: 'System Admin',
      isSystem: true,
    })
    const customRole = Role.create('role-custom', {
      name: 'editor',
      displayName: 'Editor',
      isSystem: false,
    })

    // 超級管理員不能刪除系統角色
    expect(managerRole.canDelete(systemRole)).toBe(false)
    // 超級管理員可以刪除自訂角色
    expect(managerRole.canDelete(customRole)).toBe(true)
    // 非超級管理員不能刪除任何角色
    expect(normalManagerRole.canDelete(customRole)).toBe(false)
  })
})

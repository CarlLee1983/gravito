import { describe, expect, it } from 'bun:test'
import { AdminAsRoleManagerRole } from '../../../../src/Domain/DCI/Roles/RoleManagerRole'
import { Role } from '../../../../src/Domain/Entities/Role'

describe('AdminAsRoleManagerRole', () => {
  it('should allow create only for super admin', () => {
    const superAdmin = new AdminAsRoleManagerRole({ isSuper: true })
    const normalAdmin = new AdminAsRoleManagerRole({ isSuper: false })

    // 超級管理員可以建立角色
    expect(() => superAdmin.assertCanCreateRole()).not.toThrow()

    // 普通管理員不能建立角色
    expect(() => normalAdmin.assertCanCreateRole()).toThrow()
  })

  it('should prevent system role updates', () => {
    const superAdmin = new AdminAsRoleManagerRole({ isSuper: true })
    const normalAdmin = new AdminAsRoleManagerRole({ isSuper: false })

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
    expect(() => superAdmin.assertCanUpdateRole(systemRole)).toThrow()

    // 超級管理員可以更新自訂角色
    expect(() => superAdmin.assertCanUpdateRole(customRole)).not.toThrow()

    // 普通管理員不能更新任何角色
    expect(() => normalAdmin.assertCanUpdateRole(customRole)).toThrow()
  })

  it('should prevent system role deletion', () => {
    const superAdmin = new AdminAsRoleManagerRole({ isSuper: true })
    const normalAdmin = new AdminAsRoleManagerRole({ isSuper: false })

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
    expect(() => superAdmin.assertCanDeleteRole(systemRole)).toThrow()

    // 超級管理員可以刪除自訂角色
    expect(() => superAdmin.assertCanDeleteRole(customRole)).not.toThrow()

    // 普通管理員不能刪除任何角色
    expect(() => normalAdmin.assertCanDeleteRole(customRole)).toThrow()
  })
})

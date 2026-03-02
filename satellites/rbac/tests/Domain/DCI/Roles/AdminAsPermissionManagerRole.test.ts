import { describe, expect, it } from 'bun:test'
import { AdminAsPermissionManagerRole } from '../../../../src/Domain/DCI/Roles/AdminAsPermissionManagerRole'

describe('AdminAsPermissionManagerRole', () => {
  it('should allow super admin to register permissions', () => {
    const superAdmin = new AdminAsPermissionManagerRole({ isSuper: true })

    expect(() => superAdmin.assertCanRegisterPermission()).not.toThrow()
  })

  it('should deny normal admin to register permissions', () => {
    const normalAdmin = new AdminAsPermissionManagerRole({ isSuper: false })

    expect(() => normalAdmin.assertCanRegisterPermission()).toThrow(
      'Only super admin can register permissions'
    )
  })

  it('should allow super admin to modify custom permissions', () => {
    const superAdmin = new AdminAsPermissionManagerRole({ isSuper: true })

    expect(() => superAdmin.assertCanModifyPermission(false)).not.toThrow()
  })

  it('should deny modifying system permissions', () => {
    const superAdmin = new AdminAsPermissionManagerRole({ isSuper: true })

    expect(() => superAdmin.assertCanModifyPermission(true)).toThrow(
      'Cannot modify system permission'
    )
  })

  it('should deny normal admin to modify permissions', () => {
    const normalAdmin = new AdminAsPermissionManagerRole({ isSuper: false })

    expect(() => normalAdmin.assertCanModifyPermission(false)).toThrow(
      'Only super admin can modify permissions'
    )
  })

  it('should allow super admin to delete custom permissions', () => {
    const superAdmin = new AdminAsPermissionManagerRole({ isSuper: true })

    expect(() => superAdmin.assertCanDeletePermission(false)).not.toThrow()
  })

  it('should deny deleting system permissions', () => {
    const superAdmin = new AdminAsPermissionManagerRole({ isSuper: true })

    expect(() => superAdmin.assertCanDeletePermission(true)).toThrow(
      'Cannot delete system permission'
    )
  })

  it('should deny normal admin to delete permissions', () => {
    const normalAdmin = new AdminAsPermissionManagerRole({ isSuper: false })

    expect(() => normalAdmin.assertCanDeletePermission(false)).toThrow(
      'Only super admin can delete permissions'
    )
  })
})

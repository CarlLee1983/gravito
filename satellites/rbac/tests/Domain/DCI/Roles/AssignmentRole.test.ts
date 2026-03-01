import { describe, expect, it } from 'bun:test'
import { AssignmentRole } from '../../../../src/Domain/DCI/Roles/AssignmentRole'
import { Role } from '../../../../src/Domain/Entities/Role'

describe('AssignmentRole', () => {
  const testRole = Role.create('role-1', {
    name: 'editor',
    displayName: 'Editor',
  })

  it('should allow role assignment only for super admin', () => {
    const superAssigner = new AssignmentRole({ isSuper: true })
    const normalAssigner = new AssignmentRole({ isSuper: false })

    expect(superAssigner.canAssignRole(testRole)).toBe(true)
    expect(normalAssigner.canAssignRole(testRole)).toBe(false)
  })

  it('should allow role revocation only for super admin', () => {
    const superAssigner = new AssignmentRole({ isSuper: true })
    const normalAssigner = new AssignmentRole({ isSuper: false })

    expect(superAssigner.canRevokeRole(testRole)).toBe(true)
    expect(normalAssigner.canRevokeRole(testRole)).toBe(false)
  })
})

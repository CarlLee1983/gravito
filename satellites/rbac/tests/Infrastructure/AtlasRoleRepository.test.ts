import { beforeEach, describe, expect, it } from 'bun:test'
import { Role } from '../../src/Domain/Entities/Role'
import { InMemoryRoleRepository } from '../../src/Infrastructure/Persistence/AtlasRoleRepository'

describe('InMemoryRoleRepository', () => {
  let repo: InMemoryRoleRepository

  beforeEach(() => {
    repo = new InMemoryRoleRepository()
  })

  it('should save and retrieve role by ID', async () => {
    // Arrange
    const role = Role.create('role-1', 'editor', 'Editor', {
      description: 'Content editor',
    })

    // Act
    await repo.save(role)
    const found = await repo.findById('role-1')

    // Assert
    expect(found).not.toBeNull()
    expect(found!.id).toBe('role-1')
    expect(found!.name).toBe('editor')
    expect(found!.displayName).toBe('Editor')
    expect(found!.description).toBe('Content editor')

    // 不存在的 ID 回傳 null
    const notFound = await repo.findById('non-existent')
    expect(notFound).toBeNull()
  })

  it('should find role by name via findByName()', async () => {
    // Arrange
    const role1 = Role.create('role-1', 'editor', 'Editor')
    const role2 = Role.create('role-2', 'admin', 'Administrator')
    await repo.save(role1)
    await repo.save(role2)

    // Act
    const found = await repo.findByName('admin')

    // Assert
    expect(found).not.toBeNull()
    expect(found!.id).toBe('role-2')
    expect(found!.displayName).toBe('Administrator')

    // 不存在的名稱回傳 null
    const notFound = await repo.findByName('non-existent')
    expect(notFound).toBeNull()
  })

  it('should manage admin_roles via assignRole() and revokeRole()', async () => {
    // Arrange
    const role1 = Role.create('role-1', 'editor', 'Editor')
    const role2 = Role.create('role-2', 'reviewer', 'Reviewer')
    await repo.save(role1)
    await repo.save(role2)

    // Act - 分配角色
    await repo.assignRole('admin-1', 'role-1')
    await repo.assignRole('admin-1', 'role-2')

    // Assert - 取得管理員角色
    const roleIds = await repo.getAdminRoleIds('admin-1')
    expect(roleIds).toHaveLength(2)
    expect(roleIds).toContain('role-1')
    expect(roleIds).toContain('role-2')

    // Act - 撤回一個角色
    await repo.revokeRole('admin-1', 'role-1')

    // Assert
    const updatedRoleIds = await repo.getAdminRoleIds('admin-1')
    expect(updatedRoleIds).toHaveLength(1)
    expect(updatedRoleIds).toContain('role-2')
    expect(updatedRoleIds).not.toContain('role-1')

    // idempotent: 分配已有角色不會重複
    await repo.assignRole('admin-1', 'role-2')
    const afterDuplicate = await repo.getAdminRoleIds('admin-1')
    expect(afterDuplicate).toHaveLength(1)
  })

  it('should return correct role IDs via getAdminRoleIds()', async () => {
    // Arrange - 無任何角色的管理員
    const emptyRoles = await repo.getAdminRoleIds('admin-no-roles')
    expect(emptyRoles).toEqual([])

    // 分配角色給不同管理員
    await repo.assignRole('admin-a', 'role-1')
    await repo.assignRole('admin-a', 'role-2')
    await repo.assignRole('admin-b', 'role-3')

    // Act & Assert - 各管理員的角色互不干擾
    const rolesA = await repo.getAdminRoleIds('admin-a')
    expect(rolesA).toHaveLength(2)
    expect(rolesA).toContain('role-1')
    expect(rolesA).toContain('role-2')

    const rolesB = await repo.getAdminRoleIds('admin-b')
    expect(rolesB).toHaveLength(1)
    expect(rolesB).toContain('role-3')
  })

  it('should clear all roles via removeAllRolesFromAdmin()', async () => {
    // Arrange
    await repo.assignRole('admin-clear', 'role-1')
    await repo.assignRole('admin-clear', 'role-2')
    await repo.assignRole('admin-clear', 'role-3')

    const before = await repo.getAdminRoleIds('admin-clear')
    expect(before).toHaveLength(3)

    // Act
    await repo.removeAllRolesFromAdmin('admin-clear')

    // Assert
    const after = await repo.getAdminRoleIds('admin-clear')
    expect(after).toEqual([])
  })
})

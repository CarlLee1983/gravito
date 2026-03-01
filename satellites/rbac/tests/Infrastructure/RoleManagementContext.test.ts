import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { RbacError } from '../../src/Application/Errors/RbacError'
import type { RequestingAdmin } from '../../src/Domain/DCI/Contexts/RoleManagementContext'
import { RoleManagementContext } from '../../src/Domain/DCI/Contexts/RoleManagementContext'
import { Role } from '../../src/Domain/Entities/Role'
import { InMemoryRoleRepository } from '../../src/Infrastructure/Persistence/AtlasRoleRepository'

// 建立 mock PlanetCore
function createMockCore(): PlanetCore {
  return {
    hooks: {
      doAction: mock(() => Promise.resolve()),
    },
  } as unknown as PlanetCore
}

describe('RoleManagementContext', () => {
  let roleRepo: InMemoryRoleRepository
  let core: PlanetCore
  let context: RoleManagementContext

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository()
    core = createMockCore()
    context = new RoleManagementContext(roleRepo, core)
  })

  it('should create role by super admin successfully', async () => {
    // Arrange
    const superAdmin: RequestingAdmin = { isSuper: true }

    // Act
    const role = await context.createRole('editor', 'Editor', 'Content editor role', superAdmin)

    // Assert
    expect(role.name).toBe('editor')
    expect(role.displayName).toBe('Editor')
    expect(role.description).toBe('Content editor role')
    expect(role.isSystem).toBe(false)
    expect(role.id).toBeDefined()

    // 驗證已持久化
    const saved = await roleRepo.findByName('editor')
    expect(saved).not.toBeNull()
    expect(saved!.name).toBe('editor')
  })

  it('should prevent creating duplicate role names', async () => {
    // Arrange
    const superAdmin: RequestingAdmin = { isSuper: true }
    await context.createRole('editor', 'Editor', undefined, superAdmin)

    // Act & Assert
    try {
      await context.createRole('editor', 'Another Editor', undefined, superAdmin)
      expect(true).toBe(false) // 不應走到這裡
    } catch (error) {
      expect(error).toBeInstanceOf(RbacError)
      expect((error as RbacError).code).toBe('ROLE_EXISTS')
    }
  })

  it('should prevent deleting system roles', async () => {
    // Arrange
    const superAdmin: RequestingAdmin = { isSuper: true }
    const systemRole = Role.create('sys-role-1', 'system_admin', 'System Admin', {
      isSystem: true,
    })
    await roleRepo.save(systemRole)

    // Act & Assert
    try {
      await context.deleteRole('sys-role-1', superAdmin)
      expect(true).toBe(false) // 不應走到這裡
    } catch (error) {
      expect(error).toBeInstanceOf(RbacError)
      expect((error as RbacError).code).toBe('PERMISSION_DENIED')
    }
  })

  it('should emit rbac:role-created hook after creating role', async () => {
    // Arrange
    const superAdmin: RequestingAdmin = { isSuper: true }

    // Act
    const role = await context.createRole('reviewer', 'Reviewer', 'Review content', superAdmin)

    // Assert
    const doAction = core.hooks.doAction as ReturnType<typeof mock>
    expect(doAction).toHaveBeenCalledTimes(1)
    expect(doAction).toHaveBeenCalledWith('rbac:role-created', {
      roleId: role.id,
      name: 'reviewer',
    })
  })
})

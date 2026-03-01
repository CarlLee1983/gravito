import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { PermissionManagementContext } from '../../src/Domain/DCI/Contexts/PermissionManagementContext'
import { PermissionKey } from '../../src/Domain/ValueObjects/PermissionKey'
import { InMemoryPermissionRepository } from '../../src/Infrastructure/Persistence/AtlasPermissionRepository'

// 建立 mock PlanetCore
function createMockCore(): PlanetCore {
  return {
    hooks: {
      doAction: mock(() => Promise.resolve()),
    },
  } as unknown as PlanetCore
}

describe('PermissionManagementContext', () => {
  let permissionRepo: InMemoryPermissionRepository
  let core: PlanetCore
  let context: PermissionManagementContext

  beforeEach(() => {
    permissionRepo = new InMemoryPermissionRepository()
    core = createMockCore()
    context = new PermissionManagementContext(permissionRepo, core)
  })

  it('should register a new permission via registerPermission()', async () => {
    // Act
    const permission = await context.registerPermission(
      'products:create',
      'Create Products',
      'Allow creating new products'
    )

    // Assert
    expect(permission).not.toBeNull()
    expect(permission!.key.value).toBe('products:create')
    expect(permission!.label).toBe('Create Products')
    expect(permission!.description).toBe('Allow creating new products')
    expect(permission!.groupName).toBe('products')
    expect(permission!.action).toBe('create')

    // 驗證持久化
    const key = PermissionKey.create('products:create')
    const saved = await permissionRepo.findByKey(key)
    expect(saved).not.toBeNull()
    expect(saved!.label).toBe('Create Products')
  })

  it('should be idempotent - skip if key already exists', async () => {
    // Arrange - 先註冊一次
    const first = await context.registerPermission('products:read', 'Read Products')
    expect(first).not.toBeNull()

    // Act - 再註冊同一個 key
    const second = await context.registerPermission('products:read', 'Read Products Updated')

    // Assert - 應回傳 null（跳過）
    expect(second).toBeNull()

    // 原始記錄保持不變
    const key = PermissionKey.create('products:read')
    const saved = await permissionRepo.findByKey(key)
    expect(saved!.label).toBe('Read Products')
  })

  it('should register multiple permissions via registerMany()', async () => {
    // Arrange
    const inputs = [
      { key: 'orders:create', label: 'Create Orders' },
      { key: 'orders:read', label: 'Read Orders' },
      { key: 'orders:update', label: 'Update Orders' },
    ]

    // Act
    const registered = await context.registerMany(inputs)

    // Assert
    expect(registered).toHaveLength(3)
    expect(registered[0].key.value).toBe('orders:create')
    expect(registered[1].key.value).toBe('orders:read')
    expect(registered[2].key.value).toBe('orders:update')

    // 驗證全部已持久化
    const allPermissions = await permissionRepo.findAll()
    expect(allPermissions).toHaveLength(3)
  })

  it('should create system permissions via seedSystemPermissions()', async () => {
    // Act
    await context.seedSystemPermissions()

    // Assert - 系統權限應被建立
    const allPermissions = await permissionRepo.findAll()
    expect(allPermissions.length).toBeGreaterThanOrEqual(4)

    // 驗證系統權限 key
    const keys = allPermissions.map((p) => p.key.value)
    expect(keys).toContain('admin:read')
    expect(keys).toContain('admin:manage')
    expect(keys).toContain('rbac:read')
    expect(keys).toContain('rbac:manage')

    // 驗證是系統權限
    const adminRead = allPermissions.find((p) => p.key.value === 'admin:read')
    expect(adminRead!.isSystem).toBe(true)

    // 再次呼叫不會產生重複（冪等）
    await context.seedSystemPermissions()
    const afterSecondSeed = await permissionRepo.findAll()
    expect(afterSecondSeed).toHaveLength(allPermissions.length)
  })
})

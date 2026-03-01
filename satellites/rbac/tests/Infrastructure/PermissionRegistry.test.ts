import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { PermissionRegistry } from '../../src/Application/Registry/PermissionRegistry'
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

describe('PermissionRegistry', () => {
  let permissionRepo: InMemoryPermissionRepository
  let core: PlanetCore
  let registry: PermissionRegistry

  beforeEach(() => {
    permissionRepo = new InMemoryPermissionRepository()
    core = createMockCore()
    registry = new PermissionRegistry(permissionRepo, core)
  })

  it('should register a new permission via register()', async () => {
    // Act
    await registry.register({
      key: 'catalog:create',
      label: 'Create Catalog Item',
      description: 'Allow creating catalog items',
    })

    // Assert - 驗證已持久化到 repo
    const key = PermissionKey.create('catalog:create')
    const saved = await permissionRepo.findByKey(key)
    expect(saved).not.toBeNull()
    expect(saved!.label).toBe('Create Catalog Item')
    expect(saved!.description).toBe('Allow creating catalog items')
  })

  it('should skip registration if key already exists (idempotent)', async () => {
    // Arrange - 先註冊一次
    await registry.register({
      key: 'catalog:read',
      label: 'Read Catalog',
    })

    // 記錄 hook 呼叫次數
    const doAction = core.hooks.doAction as ReturnType<typeof mock>
    const callCountAfterFirst = doAction.mock.calls.length

    // Act - 再註冊同一個 key
    await registry.register({
      key: 'catalog:read',
      label: 'Read Catalog Updated Label',
    })

    // Assert - hook 不應再次被呼叫（因為被跳過）
    expect(doAction.mock.calls.length).toBe(callCountAfterFirst)

    // 原始 label 保持不變
    const key = PermissionKey.create('catalog:read')
    const saved = await permissionRepo.findByKey(key)
    expect(saved!.label).toBe('Read Catalog')
  })

  it('should register multiple permissions via registerMany()', async () => {
    // Act
    await registry.registerMany([
      { key: 'membership:read', label: 'Read Members' },
      { key: 'membership:create', label: 'Create Members' },
      { key: 'membership:delete', label: 'Delete Members' },
    ])

    // Assert
    const all = await permissionRepo.findAll()
    expect(all).toHaveLength(3)

    const keys = all.map((p) => p.key.value).sort()
    expect(keys).toEqual(['membership:create', 'membership:delete', 'membership:read'])
  })

  it('should return all registered permissions via getAll()', async () => {
    // Arrange
    await registry.register({ key: 'analytics:read', label: 'Read Analytics' })
    await registry.register({ key: 'analytics:export', label: 'Export Analytics' })

    // Act
    const allPerms = await registry.getAll()

    // Assert
    expect(allPerms).toHaveLength(2)

    const sorted = allPerms.sort((a, b) => a.key.localeCompare(b.key))
    expect(sorted[0]).toEqual({
      key: 'analytics:export',
      label: 'Export Analytics',
    })
    expect(sorted[1]).toEqual({
      key: 'analytics:read',
      label: 'Read Analytics',
    })
  })
})

import { beforeEach, describe, expect, it } from 'bun:test'
import { Permission } from '../../src/Domain/Entities/Permission'
import { PermissionKey } from '../../src/Domain/ValueObjects/PermissionKey'
import { InMemoryPermissionRepository } from '../../src/Infrastructure/Persistence/AtlasPermissionRepository'

// 建立測試 Permission helper
function createTestPermission(
  id: string,
  key: string,
  label: string,
  options?: { description?: string; isSystem?: boolean }
): Permission {
  const permKey = PermissionKey.create(key)
  return Permission.create(id, permKey, label, options)
}

describe('InMemoryPermissionRepository', () => {
  let repo: InMemoryPermissionRepository

  beforeEach(() => {
    repo = new InMemoryPermissionRepository()
  })

  it('should save and retrieve permission by ID', async () => {
    // Arrange
    const perm = createTestPermission('perm-1', 'products:create', 'Create Products', {
      description: 'Allow creating products',
    })

    // Act
    await repo.save(perm)
    const found = await repo.findById('perm-1')

    // Assert
    expect(found).not.toBeNull()
    expect(found!.id).toBe('perm-1')
    expect(found!.key.value).toBe('products:create')
    expect(found!.label).toBe('Create Products')
    expect(found!.description).toBe('Allow creating products')

    // 不存在的 ID 回傳 null
    const notFound = await repo.findById('non-existent')
    expect(notFound).toBeNull()
  })

  it('should find permission by key via findByKey()', async () => {
    // Arrange
    const perm = createTestPermission('perm-1', 'users:read', 'Read Users')
    await repo.save(perm)

    // Act
    const key = PermissionKey.create('users:read')
    const found = await repo.findByKey(key)

    // Assert
    expect(found).not.toBeNull()
    expect(found!.id).toBe('perm-1')
    expect(found!.label).toBe('Read Users')

    // 不存在的 key 回傳 null
    const unknownKey = PermissionKey.create('users:delete')
    const notFound = await repo.findByKey(unknownKey)
    expect(notFound).toBeNull()
  })

  it('should filter permissions by group via findByGroup()', async () => {
    // Arrange
    const perm1 = createTestPermission('p1', 'products:create', 'Create Products')
    const perm2 = createTestPermission('p2', 'products:read', 'Read Products')
    const perm3 = createTestPermission('p3', 'orders:create', 'Create Orders')
    const perm4 = createTestPermission('p4', 'products:update', 'Update Products')

    await repo.save(perm1)
    await repo.save(perm2)
    await repo.save(perm3)
    await repo.save(perm4)

    // Act
    const productPerms = await repo.findByGroup('products')

    // Assert
    expect(productPerms).toHaveLength(3)
    const keys = productPerms.map((p) => p.key.value)
    expect(keys).toContain('products:create')
    expect(keys).toContain('products:read')
    expect(keys).toContain('products:update')

    // 確認 orders 不在結果中
    expect(keys).not.toContain('orders:create')

    // orders group
    const orderPerms = await repo.findByGroup('orders')
    expect(orderPerms).toHaveLength(1)
    expect(orderPerms[0].key.value).toBe('orders:create')
  })

  it('should retrieve multiple permissions by IDs via findByIds()', async () => {
    // Arrange
    const perm1 = createTestPermission('p1', 'a:read', 'Read A')
    const perm2 = createTestPermission('p2', 'b:read', 'Read B')
    const perm3 = createTestPermission('p3', 'c:read', 'Read C')

    await repo.save(perm1)
    await repo.save(perm2)
    await repo.save(perm3)

    // Act
    const found = await repo.findByIds(['p1', 'p3'])

    // Assert
    expect(found).toHaveLength(2)
    const foundIds = found.map((p) => p.id)
    expect(foundIds).toContain('p1')
    expect(foundIds).toContain('p3')
    expect(foundIds).not.toContain('p2')

    // 包含不存在的 ID 時應跳過
    const withMissing = await repo.findByIds(['p1', 'non-existent'])
    expect(withMissing).toHaveLength(1)
    expect(withMissing[0].id).toBe('p1')
  })

  it('should check existence via exists()', async () => {
    // Arrange
    const perm = createTestPermission('p1', 'admin:read', 'Read Admin')
    await repo.save(perm)

    // Act & Assert
    const existingKey = PermissionKey.create('admin:read')
    const exists = await repo.exists(existingKey)
    expect(exists).toBe(true)

    const nonExistingKey = PermissionKey.create('admin:delete')
    const notExists = await repo.exists(nonExistingKey)
    expect(notExists).toBe(false)
  })
})

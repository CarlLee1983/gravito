import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'
import { SchemaRegistry } from '../src/orm/schema/SchemaRegistry'
import { QueryBuilder } from '../src/query/QueryBuilder'
import type { CacheInterface } from '../src/types'

describe('Caching Integration', () => {
  let mockCache: CacheInterface
  let cacheStore: Map<string, any>

  beforeEach(async () => {
    // Mock DB Connection (bypass real connection creation)
    const mockConnection = {
      raw: vi.fn(),
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      table: vi.fn(),
      getDriver: vi.fn(),
    }

    // Mock Grammar
    const mockGrammar = {
      compileSelect: vi.fn(() => 'SELECT * FROM users'),
      compileInsert: vi.fn(),
      compileUpdate: vi.fn(),
      compileDelete: vi.fn(),
      wrapColumn: vi.fn((col) => col),
      wrapTable: vi.fn((table) => table),
      compileExists: vi.fn(),
      compileAggregate: vi.fn(),
    }

    // Chainable table() returning generic QueryBuilder
    mockConnection.table.mockImplementation((tableName: string) => {
      return new QueryBuilder(mockConnection as any, mockGrammar as any, tableName)
    })

    // We spy on DB.connection to return our mock
    vi.spyOn(DB, 'connection').mockReturnValue(mockConnection as any)

    // Mock Cache
    cacheStore = new Map()
    mockCache = {
      get: vi.fn(async (key: string) => cacheStore.get(key) ?? null),
      set: vi.fn(async (key: string, value: any, _ttl?: number) => {
        cacheStore.set(key, value)
      }),
      delete: vi.fn(async (key: string) => {
        cacheStore.delete(key)
      }),
      clear: vi.fn(async () => {
        cacheStore.clear()
      }),
    }
    DB.setCache(mockCache)

    // Mock Schema
    vi.spyOn(SchemaRegistry.prototype, 'get').mockReturnValue({
      tableName: 'users',
      columns: ['id', 'name', 'email'],
    })

    // Mock mockConnection.raw to return distinct results
    mockConnection.raw.mockImplementation(async (_sql: string, _bindings: any[]) => {
      return {
        rows: [
          { id: 1, name: 'John', email: 'john@example.com' },
          { id: 2, name: 'Jane', email: 'jane@example.com' },
        ],
        affectedRows: 0,
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    DB._reset()
  })

  class User extends Model {
    static table = 'users'
  }

  it('should cache query results', async () => {
    // First call: Miss
    const results1 = await User.query().cache(60).get()
    expect(results1).toHaveLength(2)
    expect(mockCache.get).toHaveBeenCalledTimes(1)
    expect(mockCache.set).toHaveBeenCalledTimes(1)

    // Check key generation - default key contains bindings (empty here) and sql
    // sql from mockGrammar is 'SELECT * FROM users'
    const key = (mockCache.set as any).mock.calls[0][0]
    expect(key).toContain('orbit:query:SELECT * FROM users')

    // Second call: Hit
    const results2 = await User.query().cache(60).get()
    expect(results2).toHaveLength(2)
    expect(mockCache.get).toHaveBeenCalledTimes(2)
    // Should NOT call set again
    expect(mockCache.set).toHaveBeenCalledTimes(1)

    // Verify results equal
    expect(results2).toEqual(results1)
  })

  it('should use explicit cache key', async () => {
    await User.query().cache(60, 'my-users-key').get()

    expect(mockCache.get).toHaveBeenCalledWith('my-users-key')
    expect(mockCache.set).toHaveBeenCalledWith('my-users-key', expect.any(Object), 60)
  })

  it('should not cache if cache method is not called', async () => {
    await User.query().get()
    expect(mockCache.get).not.toHaveBeenCalled()
    expect(mockCache.set).not.toHaveBeenCalled()
  })

  it('should invalidate cache if updated? (Manual via cache removal)', async () => {
    // This implementation does NOT automatically invalidate cache on update.
    // User must handle invalidation.
  })
})

import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'
import { SchemaRegistry } from '../src/orm/schema/SchemaRegistry'
import { QueryBuilder } from '../src/query/QueryBuilder'
import type { CacheInterface } from '../src/types'

describe('Caching Integration', () => {
  const TEST_CONN = `caching_test_${Math.random().toString(36).slice(2)}`
  let mockCache: CacheInterface
  let cacheStore: Map<string, any>
  let connectionSpy: any
  let registrySpy: any

  class User extends Model {
    static override table = 'users'
    static override connection = TEST_CONN
  }

  beforeEach(async () => {
    // Mock Grammar
    const mockGrammar = {
      compileSelect: mock(() => 'SELECT * FROM users'),
      compileInsert: mock(),
      compileUpdate: mock(),
      compileDelete: mock(),
      wrapColumn: mock((col) => col),
      wrapTable: mock((table) => table),
      compileExists: mock(),
      compileAggregate: mock(),
      getStructuralKey: mock(() => 'users:select:*'),
    }

    // Mock DB Connection (bypass real connection creation)
    const mockConnection: any = {
      raw: mock(),
      select: mock(),
      insert: mock(),
      update: mock(),
      delete: mock(),
      table: mock((tableName: string) => {
        return new QueryBuilder(mockConnection as any, mockGrammar as any, tableName)
      }),
      getTracer: () => undefined,
      getDriver: mock(() => ({
        getDriverName: () => 'mock',
        getGrammar: () => mockGrammar,
      })),
      getGrammar: () => mockGrammar,
    }

    // Mock DB.connection
    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) {
        return mockConnection
      }
      return originalConnection.call(DB, name as any)
    })

    // Mock Cache
    cacheStore = new Map()
    mockCache = {
      get: mock(async (key: string) => cacheStore.get(key) ?? null),
      set: mock(async (key: string, value: any, _ttl?: number) => {
        cacheStore.set(key, value)
      }),
      delete: mock(async (key: string) => {
        cacheStore.delete(key)
      }),
      clear: mock(async () => {
        cacheStore.clear()
      }),
    }
    DB.setCache(mockCache)

    // Mock Schema
    registrySpy = spyOn(SchemaRegistry.prototype, 'get').mockReturnValue({
      tableName: 'users',
      columns: ['id', 'name', 'email'],
    } as any)

    // Mock mockConnection.raw to return distinct results
    mockConnection.raw.mockImplementation(async (_sql: string, _bindings: any[]) => {
      return {
        rows: [
          { id: 1, name: 'John', email: 'john@example.com' },
          { id: 2, name: 'Jane', email: 'jane@example.com' },
        ],
        rowCount: 2,
      }
    })
  })

  afterEach(() => {
    connectionSpy.mockRestore()
    registrySpy.mockRestore()
    User.connection = TEST_CONN
  })

  it('should cache query results', async () => {
    User.connection = TEST_CONN
    // First call: Miss
    const results1 = await User.query().cache(60).get()
    expect(results1).toHaveLength(2)
    expect(mockCache.get).toHaveBeenCalledTimes(1)
    expect(mockCache.set).toHaveBeenCalledTimes(1)

    // Second call: Hit
    const results2 = await User.query().cache(60).get()
    expect(results2).toHaveLength(2)
    expect(mockCache.get).toHaveBeenCalledTimes(2)
    expect(mockCache.set).toHaveBeenCalledTimes(1) // No new set
  })

  it('should use explicit cache key', async () => {
    User.connection = TEST_CONN
    const customKey = 'custom-user-key'
    await User.query().cache(60, customKey).get()
    expect(mockCache.get).toHaveBeenCalledWith(customKey)
  })

  it('should not cache if cache method is not called', async () => {
    User.connection = TEST_CONN
    await User.query().get()
    expect(mockCache.get).not.toHaveBeenCalled()
  })

  it('should invalidate cache if updated? (Manual via cache removal)', async () => {
    User.connection = TEST_CONN
    const key = 'user-list'
    await User.query().cache(60, key).get()
    expect(cacheStore.has(key)).toBe(true)

    await DB.getCache()?.delete(key)
    expect(cacheStore.has(key)).toBe(false)
  })
})

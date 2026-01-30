import { afterEach, beforeEach, describe, expect, it, jest, spyOn } from 'bun:test'
import { DB } from '../src/DB'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import { column } from '../src/orm/model/decorators'
import { Model } from '../src/orm/model/Model'
import { HasMany } from '../src/orm/model/relationships'

describe('Lateral Eager Loading', () => {
  const TEST_CONN = `lateral_test_${Math.random().toString(36).slice(2)}`
  let mockConnection: any
  let connectionSpy: any

  class Post extends Model {
    static override table = 'posts'
    static override connection = TEST_CONN
    @column({ isPrimary: true }) declare id: number
    declare title: string
    declare user_id: number
  }

  class User extends Model {
    static override table = 'users'
    static override connection = TEST_CONN
    @column({ isPrimary: true }) declare id: number
    declare name: string

    @HasMany(() => Post, 'user_id')
    declare posts: Post[]
  }

  beforeEach(() => {
    mockConnection = {
      getName: () => TEST_CONN,
      getTracer: () => undefined,
      getDriver: () => ({ getDriverName: () => 'postgres' }),
      getConfig: () => ({ driver: 'postgres' }),
      getGrammar: () => new PostgresGrammar(),
      raw: jest.fn(),
      table: (tableName: string) => {
        const { QueryBuilder } = require('../src/query/QueryBuilder')
        const builder = new QueryBuilder(mockConnection, new PostgresGrammar(), tableName)
        return builder
      },
      transaction: jest.fn(),
      disconnect: jest.fn(),
    }
    jest.clearAllMocks()

    // Register the mock connection
    DB.addConnection(TEST_CONN, {
      driver: 'postgres',
      host: 'localhost',
      database: 'test',
    } as any)

    // Spy on DB.connection to return our mock
    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) return mockConnection
      return originalConnection.call(DB, name as any)
    })

    User.connection = TEST_CONN
    Post.connection = TEST_CONN
  })

  afterEach(() => {
    if (connectionSpy) {
      connectionSpy.mockRestore()
    }
    User.connection = undefined
    Post.connection = undefined
  })

  it('should use LATERAL JOIN when limit is applied to eager loaded relationship', async () => {
    mockConnection.raw.mockResolvedValue({
      rows: [{ id: 1, name: 'Carl' }],
      rowCount: 1,
    })

    await User.with({
      posts: (q) => q.limit(2),
    }).get()

    // Second call should be the eager loading query with LATERAL
    const lastSql = mockConnection.raw.mock.calls[1][0]
    expect(lastSql).toContain('LATERAL')
    expect(lastSql).toContain('LIMIT 2')
  })

  it('should fallback to whereIn when no limit/offset is present', async () => {
    mockConnection.raw.mockResolvedValue({
      rows: [{ id: 1, name: 'Carl' }],
      rowCount: 1,
    })

    await User.with('posts').get()

    const lastSql = mockConnection.raw.mock.calls[0][0]
    expect(lastSql).not.toContain('LATERAL')
  })
})

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test'
import { DB } from '../src/DB'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import { column } from '../src/orm/model/decorators'
import { Model } from '../src/orm/model/Model'
import { BelongsTo, getRelationships, HasMany } from '../src/orm/model/relationships'
import { QueryBuilder } from '../src/query/QueryBuilder'
import type { ConnectionContract, ExecuteResult } from '../src/types'

// 1. Define Models
class User extends Model {
  static override table = 'users'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string

  @HasMany(() => Post, 'user_id')
  declare posts: Post[]
}

class Post extends Model {
  static override table = 'posts'
  @column({ isPrimary: true }) declare id: number
  @column() declare title: string
  @column() declare user_id: number

  @BelongsTo(() => User, 'user_id')
  declare user: User

  @HasMany(() => Comment, 'post_id')
  declare comments: Comment[]
}

class Comment extends Model {
  static override table = 'comments'
  @column({ isPrimary: true }) declare id: number
  @column() declare body: string
  @column() declare post_id: number
}

// 2. Helper to create a mock connection
function createMockConnection(responses: Record<string, any[]>) {
  const grammar = new PostgresGrammar()
  const mockDriver: any = {
    getDriverName: () => 'mock',
    connect: async () => undefined,
    disconnect: async () => undefined,
    isConnected: () => true,
    query: async (sql: string, _bindings?: unknown[]) => {
      const tableMatch = sql.match(/FROM "([^"]+)"/)
      const tableName = tableMatch?.[1] ?? ''
      const rows = responses[tableName] ?? []
      return { rows, rowCount: rows.length }
    },
    execute: async (): Promise<ExecuteResult> => ({ affectedRows: 0 }),
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    inTransaction: () => false,
  }

  let connection: ConnectionContract

  connection = {
    getName: () => 'test',
    getDriver: () => mockDriver,
    getConfig: () => ({ driver: 'postgres' }),
    getGrammar: () => grammar,
    table: (tableName: string) => new QueryBuilder(connection, grammar, tableName),
    raw: async (sql: string, bindings?: unknown[]) => mockDriver.query(sql, bindings),
    execute: async (sql: string, bindings?: unknown[]) => mockDriver.execute(sql, bindings),
    transaction: async <T>(cb: (conn: ConnectionContract) => Promise<T>) => cb(connection),
    disconnect: async () => undefined,
    getTracer: () => undefined,
  }

  return connection
}

describe('Advanced Eager Loading', () => {
  const TEST_CONN = `eager_load_${Math.random().toString(36).slice(2)}`
  let connectionSpy: any

  beforeAll(() => {
    DB.addConnection(TEST_CONN, { driver: 'sqlite', database: ':memory:' } as any)
    User.connection = TEST_CONN
    Post.connection = TEST_CONN
    Comment.connection = TEST_CONN
  })

  afterAll(async () => {
    await DB.disconnect(TEST_CONN)
    DB.purge(TEST_CONN)
  })

  beforeEach(() => {
    // @ts-expect-error - access private static property for reset
    DB.initialized = true
  })

  afterEach(() => {
    if (connectionSpy) {
      connectionSpy.mockRestore()
      connectionSpy = null
    }
  })

  it('should have relationships registered', () => {
    const relationships = getRelationships(User)
    expect(relationships).toBeDefined()
    expect(relationships.has('posts')).toBe(true)
  })

  it('should support string with() and basic eager loading', async () => {
    const responses = {
      users: [{ id: 1, name: 'Carl' }],
      posts: [
        { id: 10, user_id: 1, title: 'Post 1' },
        { id: 11, user_id: 1, title: 'Post 2' },
      ],
    }
    const mockConn = createMockConnection(responses)

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) return mockConn
      return originalConnection.call(DB, name as any)
    })

    const users = await User.with('posts').get()

    expect(users).toHaveLength(1)
    expect(users[0].posts).toHaveLength(2)
    expect(users[0].posts[0]).toBeInstanceOf(Post)
  })

  it('should support nested eager loading with dot notation', async () => {
    const responses = {
      users: [{ id: 1, name: 'Carl' }],
      posts: [{ id: 10, user_id: 1, title: 'Post 1' }],
      comments: [{ id: 100, post_id: 10, body: 'Comment 1' }],
    }
    const mockConn = createMockConnection(responses)

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) return mockConn
      return originalConnection.call(DB, name as any)
    })

    const users = await User.with('posts.comments').get()

    expect(users[0].posts[0].comments).toHaveLength(1)
    expect(users[0].posts[0].comments[0]).toBeInstanceOf(Comment)
  })

  it('should support constrained eager loading with callback', async () => {
    const responses = {
      users: [{ id: 1, name: 'Carl' }],
      posts: [{ id: 10, user_id: 1, title: 'Post 1', status: 'published' }],
    }
    const mockConn = createMockConnection(responses)

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) return mockConn
      return originalConnection.call(DB, name as any)
    })

    await User.with({
      posts: (q) => q.where('status', 'published'),
    }).get()
  })

  it('should support multiple eager loads in one with() call', async () => {
    const responses = {
      users: [{ id: 1, name: 'Carl' }],
      posts: [{ id: 10, user_id: 1, title: 'Post' }],
    }
    const mockConn = createMockConnection(responses)

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) return mockConn
      return originalConnection.call(DB, name as any)
    })

    const users = await User.with(['posts']).get()
    expect(users[0].posts).toBeDefined()
  })
})

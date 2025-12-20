/**
 * Advanced Eager Loading Tests
 */

import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { DB, Model } from '../src'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import { BelongsTo, getRelationships, HasMany } from '../src/orm'
import { QueryBuilder } from '../src/query/QueryBuilder'
import type {
  ConnectionContract,
  DriverContract,
  DriverType,
  ExecuteResult,
  QueryResult,
} from '../src/types'

// 1. Define Models
class User extends Model {
  static override table = 'users'
  static override strictMode = false

  @HasMany(() => Post, 'user_id', 'id')
  declare posts: Post[]
}

class Post extends Model {
  static override table = 'posts'
  static override strictMode = false

  @BelongsTo(() => User, 'user_id', 'id')
  declare user: User

  @HasMany(() => Comment, 'post_id', 'id')
  declare comments: Comment[]
}

class Comment extends Model {
  static override table = 'comments'
  static override strictMode = false
}

// 2. Mock Connection & Driver
type MockRow = Record<string, unknown>
type MockResponses = Record<string, MockRow[]>

function createMockConnection(responses: MockResponses): ConnectionContract {
  const grammar = new PostgresGrammar()

  const mockDriver: DriverContract = {
    getDriverName: (): DriverType => 'postgres',
    connect: async () => undefined,
    disconnect: async () => undefined,
    isConnected: () => true,
    query: async (sql: string, bindings: unknown[] = []): Promise<QueryResult<MockRow>> => {
      // Very simple table detection from SQL
      const tableMatch = sql.match(/FROM "([^"]+)"/)
      const tableName = tableMatch?.[1] ?? ''

      let rows = responses[tableName] ?? []

      // Basic simulation of whereIn (filtering by foreign key)
      if (sql.includes('IN ($')) {
        const colMatch = sql.match(/WHERE "([^"]+)" IN/)
        const col = colMatch?.[1] ?? ''
        if (col && bindings.length > 0) {
          rows = rows.filter((row) => bindings.includes(row[col]))
        }
      }

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
    table: (tableName: string) => new QueryBuilder(connection, grammar, tableName),
    raw: async (sql: string, bindings?: unknown[]) => mockDriver.query(sql, bindings),
    transaction: async <T>(cb: (conn: ConnectionContract) => Promise<T>) => cb(connection),
    disconnect: async () => undefined,
  }

  return connection
}

describe('Advanced Eager Loading', () => {
  beforeEach(() => {
    // @ts-expect-error - access private static property for reset
    DB.initialized = true
  })

  it('should have relationships registered', () => {
    const rels = getRelationships(User)
    // console.log('User relationships:', [...rels.keys()])
    expect(rels.has('posts')).toBe(true)
  })

  it('should support string with() and basic eager loading', async () => {
    const responses = {
      users: [{ id: 1, name: 'Carl' }],
      posts: [{ id: 10, user_id: 1, title: 'Post 1' }],
    }
    const mockConn = createMockConnection(responses)
    spyOn(DB, 'connection').mockReturnValue(mockConn)

    const users = await User.with('posts').get()

    expect(users).toHaveLength(1)
    expect(users[0].posts).toHaveLength(1)
    expect(users[0].posts[0].title).toBe('Post 1')
  })

  it('should support nested eager loading with dot notation', async () => {
    const responses = {
      users: [{ id: 1, name: 'Carl' }],
      posts: [{ id: 10, user_id: 1, title: 'Post 1' }],
      comments: [{ id: 100, post_id: 10, body: 'Nice!' }],
    }
    const mockConn = createMockConnection(responses)
    spyOn(DB, 'connection').mockReturnValue(mockConn)

    const users = await User.with('posts.comments').get()

    expect(users).toHaveLength(1)
    expect(users[0].posts).toHaveLength(1)
    expect(users[0].posts[0].comments).toHaveLength(1)
    expect(users[0].posts[0].comments[0].body).toBe('Nice!')
  })

  it('should support constrained eager loading with callback', async () => {
    const responses = {
      users: [{ id: 1, name: 'Carl' }],
      posts: [
        { id: 10, user_id: 1, title: 'Published Post', status: 'published' },
        { id: 11, user_id: 1, title: 'Draft Post', status: 'draft' },
      ],
    }
    const mockConn = createMockConnection(responses)
    const spy = spyOn(mockConn.getDriver(), 'query').mockImplementation(
      async (sql: string, _bindings?: unknown[]) => {
        // Capture sql to verify constraint
        if (sql.includes('posts')) {
          expect(sql).toContain('"status" = $')
        }

        const tableMatch = sql.match(/FROM "([^"]+)"/)
        const tableName = tableMatch?.[1] ?? ''
        const rows = responses[tableName] ?? []
        return { rows, rowCount: rows.length }
      }
    )

    spyOn(DB, 'connection').mockReturnValue(mockConn)

    await User.with({
      posts: (q) => q.where('status', 'published'),
    }).get()

    expect(spy).toHaveBeenCalled()
  })

  it('should support multiple eager loads in one with() call', async () => {
    const responses = {
      users: [{ id: 1, name: 'Carl' }],
      posts: [{ id: 10, user_id: 1, title: 'Post' }],
    }
    const mockConn = createMockConnection(responses)
    spyOn(DB, 'connection').mockReturnValue(mockConn)

    const users = await User.with(['posts']).get()
    expect(users[0].posts).toBeDefined()
  })
})

import { afterEach, beforeEach, describe, expect, it, jest, spyOn } from 'bun:test'
import { DB } from '../src/DB'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import { Model } from '../src/orm/model/Model'
import { HasMany } from '../src/orm/model/relationships'

describe('Lateral Eager Loading', () => {
  let mockConnection: any

  class Post extends Model {
    static override table = 'posts'
    declare id: number
    declare user_id: number
    declare title: string
  }

  class User extends Model {
    static override table = 'users'
    static override connection = 'postgres'
    declare id: number
    declare name: string

    @HasMany(() => Post, 'user_id')
    declare posts: Post[]
  }

  beforeEach(() => {
    mockConnection = {
      getName: () => 'postgres',
      getDriver: () => ({ getDriverName: () => 'postgres' }),
      getConfig: () => ({ driver: 'postgres' }),
      getGrammar: () => new PostgresGrammar(),
      raw: jest.fn(),
      table: jest.fn(),
      transaction: jest.fn(),
      disconnect: jest.fn(),
    }
    jest.clearAllMocks()

    // Register the mock connection
    DB.addConnection('postgres', {
      driver: 'postgres',
      host: 'localhost',
      database: 'test',
    } as any)

    // Spy on DB.connection to return our mock
    jest.spyOn(DB, 'connection').mockReturnValue(mockConnection as any)

    // Mock the table method to return a real QueryBuilder but we'll mock its execution
    const { QueryBuilder } = require('../src/query/QueryBuilder')
    mockConnection.table = jest.fn().mockImplementation((table) => {
      const qb = new QueryBuilder(mockConnection, new PostgresGrammar(), table)
      // Spy on this specific qb's get method
      jest.spyOn(qb, 'get').mockImplementation(async function (this: any) {
        if (this.tableName === 'users') {
          return [{ id: 1, name: 'John' }]
        }
        // Fallback for posts or other tables
        return []
      })
      return qb
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should use LATERAL JOIN when limit is applied to eager loaded relationship', async () => {
    // Mock the lateral raw result
    mockConnection.raw = jest.fn().mockResolvedValue({
      rows: [
        { id: 1, user_id: 1, title: 'Post 1' },
        { id: 2, user_id: 1, title: 'Post 2' },
      ],
    })

    const users = await User.with({
      posts: (query) => query.limit(2),
    }).get()

    expect(users).toHaveLength(1)
    expect(users[0].posts).toHaveLength(2)

    // Verify that connection.raw was called with the LATERAL JOIN SQL
    expect(mockConnection.raw).toHaveBeenCalledWith(
      expect.stringContaining('CROSS JOIN LATERAL'),
      expect.anything()
    )

    const calls = mockConnection.raw.mock.calls
    const [sql, bindings] = calls[0]
    expect(bindings[0]).toEqual([1])
    expect(sql).toContain('unnest($1::int)')
    expect(sql).toContain('LIMIT 2')
  })

  it('should fallback to whereIn when no limit/offset is present', async () => {
    await User.with('posts').get()

    // Should NOT use connection.raw for lateral
    expect(mockConnection.raw).not.toHaveBeenCalled()
  })
})

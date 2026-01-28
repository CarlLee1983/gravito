import { beforeAll, describe, expect, it } from 'bun:test'
import { DB } from '../src/DB'
import { QueryBuilder } from '../src/query/QueryBuilder'

describe('DB', () => {
  beforeAll(() => {
    DB.configure({
      default: 'test',
      connections: {
        test: {
          driver: 'sqlite',
          database: ':memory:',
        },
      },
    })
  })

  it('should return a query builder for a table', () => {
    const builder = DB.table('users')
    expect(builder).toBeInstanceOf(QueryBuilder)
  })

  it('should handle debug mode', () => {
    DB.debug(true)
    expect(DB.isDebug()).toBe(true)
    DB.debug(false)
    expect(DB.isDebug()).toBe(false)
  })

  it('should clear query log', () => {
    DB.debug(true)
    DB.logQuery('SELECT 1', [], 10)
    expect(DB.getQueryLog()).toHaveLength(1)
    DB.clearQueryLog()
    expect(DB.getQueryLog()).toHaveLength(0)
    DB.debug(false)
  })

  it('should handle pretend mode', async () => {
    await DB.connection().getDriver().execute('CREATE TABLE users (id INTEGER PRIMARY KEY)')
    const { queries } = await DB.pretend(async () => {
      await DB.table('users').where('id', 1).get()
    })
    expect(queries).toContain('SELECT * FROM "users" WHERE "id" = 1')
  })
})

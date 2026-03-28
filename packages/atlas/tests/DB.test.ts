import { beforeAll, describe, expect, it, test } from 'bun:test'
import { Connection } from '../src/connection/Connection'
import { DB } from '../src/DB'
import { QueryBuilder } from '../src/query/QueryBuilder'

const CONNECTION_NAME = `db_test_${Math.random().toString(36).slice(2)}`

describe('DB', () => {
  beforeAll(() => {
    DB.addConnection(CONNECTION_NAME, {
      driver: 'sqlite',
      database: ':memory:',
      useNativeDriver: false, // Disable due to Bun.sql limitation
    })
  })

  it('should return a query builder for a table', () => {
    const builder = DB.connection(CONNECTION_NAME).table('users')
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

  test('_reset should clear all static state', async () => {
    DB.debug(true)
    expect(Connection.queryListeners.length).toBeGreaterThan(0)

    await DB._reset()

    expect(Connection.queryListeners.length).toBe(0)
    expect((DB as any).shardingManagers.size).toBe(0)
    expect((DB as any)._queryLog.length).toBe(0)
    expect((DB as any)._debug).toBe(false)
    expect((DB as any).queryListener).toBeUndefined()

    // Restore connection for subsequent tests
    DB.addConnection(CONNECTION_NAME, {
      driver: 'sqlite',
      database: ':memory:',
      useNativeDriver: false,
    })
  })

  it('should handle pretend mode', async () => {
    const oldDefault = DB.getDefaultConnection()
    try {
      DB.setDefaultConnection(CONNECTION_NAME)

      await DB.connection().getDriver().execute('CREATE TABLE users (id INTEGER PRIMARY KEY)')
      const { queries } = await DB.pretend(async () => {
        await DB.table('users').where('id', 1).get()
      })
      expect(queries).toContain('SELECT * FROM "users" WHERE "id" = 1')
    } finally {
      DB.setDefaultConnection(oldDefault)
    }
  })
})

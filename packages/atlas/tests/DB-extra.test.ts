import { describe, expect, it, spyOn } from 'bun:test'
import { DB } from '../src/DB'
import type { ConnectionContract, QueryBuilderContract, QueryResult } from '../src/types'

describe('DB facade', () => {
  it('routes queries through configured connections', async () => {
    const TEST_CONN = `db_extra_${Math.random().toString(36).slice(2)}`
    let began = false

    DB.addConnection(TEST_CONN, {
      driver: 'postgres',
      database: 'test',
    } as any)

    const conn = DB.connection(TEST_CONN)

    const mockDriver: any = {
      getDriverName: () => 'postgres',
      connect: async () => {},
      disconnect: async () => {},
      isConnected: () => true,
      query: async () => ({ rows: [{ id: 1 }], rowCount: 1 }),
      execute: async () => ({ affectedRows: 1 }),
      beginTransaction: async () => {
        began = true
      },
      commit: async () => {},
      rollback: async () => {},
      inTransaction: () => false,
    }

    const mockGrammar: any = {
      compileSelect: () => 'SELECT 1',
      compileInsert: () => 'INSERT INTO users DEFAULT VALUES',
      compileUpdate: () => 'UPDATE users SET name = ?',
      compileDelete: () => 'DELETE FROM users',
      compileAggregate: () => 'SELECT MAX(id) FROM users',
      getStructuralKey: () => 'mock',
      wrapTable: (t: any) => t,
      wrapColumn: (c: any) => c,
      getPlaceholder: () => '?',
    }

    // @ts-expect-error - inject mock driver
    conn.driver = mockDriver
    // @ts-expect-error - inject mock grammar
    conn.grammar = mockGrammar

    const oldDefault = DB.getDefaultConnection()
    try {
      // Test facade methods with explicit connection
      const conn = DB.connection(TEST_CONN)
      await conn.raw('SELECT 1')

      await DB.connection(TEST_CONN).table('users').select('id').get()
      await DB.connection(TEST_CONN).table('users').insert({ name: 'Ada' })
      await DB.connection(TEST_CONN).table('users').where('id', 1).update({ name: 'Nova' })
      await DB.connection(TEST_CONN).table('users').where('id', 1).delete()

      await DB.transaction(async () => 'ok', TEST_CONN)
      const trx = await DB.beginTransaction(TEST_CONN)
      await trx.getDriver().commit()

      expect(began).toBe(true)
    } finally {
      DB.setDefaultConnection(oldDefault)
      await DB.disconnect(TEST_CONN)
      DB.purge(TEST_CONN)
    }
  })
})

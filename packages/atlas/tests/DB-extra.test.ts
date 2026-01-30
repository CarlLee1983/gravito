import { describe, expect, it, spyOn } from 'bun:test'
import { DB } from '../src/DB'
import type { ConnectionContract, QueryBuilderContract, QueryResult } from '../src/types'

function makeBuilder(): QueryBuilderContract<Record<string, unknown>> {
  const builder: any = {
    where: () => builder,
    select: () => builder,
    insert: async () => [{ id: 1 }],
    update: async () => 2,
    delete: async () => 3,
  }
  return builder as QueryBuilderContract<Record<string, unknown>>
}

describe('DB facade', () => {
  it('routes queries through configured connections', async () => {
    const TEST_CONN = 'db_extra_test'
    const originalManager = (DB as any).manager
    const originalInitialized = (DB as any).initialized

    const builder = makeBuilder()
    let began = false
    const managerCalls: string[] = []

    const connection: ConnectionContract = {
      getName: () => TEST_CONN,
      getDriver: () =>
        ({
          beginTransaction: async () => {
            began = true
          },
          commit: async () => {},
          getDriverName: () => 'postgres',
        }) as any,
      getConfig: () => ({ driver: 'postgres', database: 'test' }),
      table: () => builder as any,
      raw: (async (_sql: string): Promise<QueryResult<any>> => ({
        rows: [{ id: 1 }],
        rowCount: 1,
      })) as any,
      execute: (async (_sql: string): Promise<any> => ({
        affectedRows: 1,
      })) as any,
      transaction: async <T>(callback: (conn: ConnectionContract) => Promise<T>) =>
        callback(connection),
      disconnect: async () => {},
      getGrammar: () => ({}) as any,
    }

    const mockManager = {
      connection: (name?: string) => {
        if (name === TEST_CONN || !name) return connection
        return originalManager.connection(name)
      },
      setDefaultConnection: (name: string) => {
        managerCalls.push('setDefaultConnection')
      },
      getDefaultConnection: () => TEST_CONN,
      hasConnection: (name: string) => name === TEST_CONN,
      getConnectionNames: () => [TEST_CONN],
      getConfig: (name: string) => (name === TEST_CONN ? { driver: 'postgres' } : undefined),
      disconnect: async () => {
        managerCalls.push('disconnect')
      },
      disconnectAll: async () => {
        managerCalls.push('disconnectAll')
      },
      reconnect: async () => connection,
      purge: () => {
        managerCalls.push('purge')
      },
      addConnection: () => {},
    }

    try {
      ;(DB as any).manager = mockManager
      ;(DB as any).initialized = true

      DB.setDefaultConnection(TEST_CONN)
      expect(DB.hasConnection(TEST_CONN)).toBe(true)
      expect(DB.getConnectionNames()).toContain(TEST_CONN)

      await DB.raw('SELECT 1')
      await DB.rawQuery('SELECT 1')

      await DB.select('users', ['id'])
      await DB.insert('users', { name: 'Ada' })
      await DB.update('users', { id: 1 }, { name: 'Nova' })
      await DB.delete('users', { id: 1 })

      await DB.transaction(async () => 'ok')
      const trx = await DB.beginTransaction()
      await trx.getDriver().commit()

      await DB.disconnect(TEST_CONN)
      await DB.reconnect(TEST_CONN)
      DB.purge(TEST_CONN)

      expect(managerCalls).toContain('disconnect')
      expect(managerCalls).toContain('purge')
      expect(began).toBe(true)
    } finally {
      ;(DB as any).initialized = originalInitialized
      ;(DB as any).manager = originalManager
    }
  })
})

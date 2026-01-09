import { describe, expect, it } from 'bun:test'
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
    const originalConnection = DB.connection
    const originalGetConfig = DB.getConnectionConfig
    const originalInitialized = (DB as any).initialized
    const originalManager = (DB as any).manager

    const builder = makeBuilder()
    let began = false
    const managerCalls: string[] = []

    const connection: ConnectionContract = {
      getName: () => 'default',
      getDriver: () =>
        ({
          beginTransaction: async () => {
            began = true
          },
          commit: async () => {},
        }) as any,
      getConfig: () => ({ driver: 'postgres', database: 'test' }),
      table: () => builder,
      raw: async (_sql: string): Promise<QueryResult> => ({ rows: [{ id: 1 }], rowCount: 1 }),
      transaction: async <T>(callback: (conn: ConnectionContract) => Promise<T>) =>
        callback(connection),
      disconnect: async () => {},
    }

    try {
      ;(DB as any).manager = {
        connection: () => connection,
        setDefaultConnection: (_name: string) => {
          managerCalls.push('setDefaultConnection')
        },
        getDefaultConnection: () => 'default',
        hasConnection: () => true,
        getConnectionNames: () => ['default'],
        getConfig: () => ({ driver: 'postgres', database: 'test' }),
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
      DB.connection = () => connection
      DB.getConnectionConfig = () => ({ driver: 'postgres', database: 'test' })
      ;(DB as any).initialized = true

      DB.setDefaultConnection('default')
      expect(DB.hasConnection('default')).toBe(true)
      expect(DB.getConnectionNames()).toEqual(['default'])

      await DB.raw('SELECT 1')
      await DB.rawQuery('SELECT 1')

      await DB.select('users', ['id'])
      await DB.insert('users', { name: 'Ada' })
      await DB.update('users', { id: 1 }, { name: 'Nova' })
      await DB.delete('users', { id: 1 })

      await DB.transaction(async () => 'ok')
      const trx = await DB.beginTransaction()
      await trx.getDriver().commit()

      await DB.disconnect('default')
      await DB.disconnectAll()
      await DB.reconnect('default')
      DB.purge('default')

      expect(managerCalls).toContain('disconnect')
      expect(managerCalls).toContain('disconnectAll')
      expect(managerCalls).toContain('purge')
      expect(began).toBe(true)
    } finally {
      DB.connection = originalConnection
      DB.getConnectionConfig = originalGetConfig
      ;(DB as any).initialized = originalInitialized
      ;(DB as any).manager = originalManager
    }
  })
})

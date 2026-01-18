import { describe, expect, it } from 'bun:test'
import { Connection } from '../src/connection/Connection'
import { ConnectionManager } from '../src/connection/ConnectionManager'

describe('Connection and ConnectionManager', () => {
  it('proxies driver methods and emits query listeners', async () => {
    let connected = false
    let disconnected = false
    let pinged = false

    const driver = {
      getDriverName: () => 'postgres',
      connect: async () => {
        connected = true
      },
      disconnect: async () => {
        disconnected = true
      },
      isConnected: () => connected,
      query: async () => ({ rows: [{ ok: true }], rowCount: 1 }),
      execute: async () => ({ affectedRows: 1 }),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      inTransaction: () => false,
      ping: () => {
        pinged = true
      },
    }

    const manager = new ConnectionManager({
      test: { driver: 'postgres', database: 'test' } as any,
    })

    const connection = manager.connection('test')

    // @ts-expect-error - accessing internal driver
    connection.driver = driver as any
    // @ts-expect-error - accessing internal grammar
    connection.grammar = {
      compileSelect: () => 'SELECT 1',
    } as any

    await (connection as any).connect()
    expect(connected).toBe(true)

    ;(connection as any).ping()
    expect(pinged).toBe(true)

    let listenerCalled = false
    Connection.queryListeners.push((payload) => {
      listenerCalled = true
      expect(payload.sql).toBe('SELECT 1')
    })

    const result = await connection.raw('SELECT 1')
    expect(result.rows[0]).toMatchObject({ ok: true })
    expect(listenerCalled).toBe(true)

    await (connection as any).disconnect()
    expect(disconnected).toBe(true)

    Connection.queryListeners = []
  })

  it('manages connections lifecycle', async () => {
    const manager = new ConnectionManager({
      default: { driver: 'sqlite', database: ':memory:' } as any,
      analytics: { driver: 'sqlite', database: ':memory:' } as any,
    })

    const conn = manager.connection()
    expect(manager.hasConnection('analytics')).toBe(true)
    expect(manager.getConnectionNames()).toEqual(['default', 'analytics'])

    await manager.disconnect()
    await manager.reconnect('analytics')
    manager.purge('analytics')

    await manager.disconnectAll()
    expect(conn.getName()).toBe('default')
  })
})

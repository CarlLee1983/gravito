import { afterEach, describe, expect, it } from 'bun:test'
import { Connection } from '../src/connection/Connection'
import { ConnectionManager } from '../src/connection/ConnectionManager'

const originalCreateDriver = Connection.prototype.createDriver
const originalCreateGrammar = Connection.prototype.createGrammar

describe('Connection and ConnectionManager', () => {
  afterEach(() => {
    Connection.prototype.createDriver = originalCreateDriver
    Connection.prototype.createGrammar = originalCreateGrammar
    Connection.queryListeners = []
  })

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

    Connection.prototype.createDriver = () => driver as any
    Connection.prototype.createGrammar = () =>
      ({
        compileSelect: () => 'SELECT 1',
      }) as any

    const manager = new ConnectionManager({
      default: { driver: 'postgres', database: 'test' } as any,
    })

    const connection = manager.connection()
    await connection.connect()
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

    await connection.disconnect()
    expect(disconnected).toBe(true)
  })

  it('manages connections lifecycle', async () => {
    Connection.prototype.createDriver = () =>
      ({
        getDriverName: () => 'postgres',
        connect: async () => {},
        disconnect: async () => {},
        isConnected: () => true,
        query: async () => ({ rows: [], rowCount: 0 }),
        execute: async () => ({ affectedRows: 0 }),
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        inTransaction: () => false,
      }) as any
    Connection.prototype.createGrammar = () =>
      ({
        compileSelect: () => 'SELECT 1',
      }) as any

    const manager = new ConnectionManager({
      default: { driver: 'postgres', database: 'test' } as any,
      analytics: { driver: 'postgres', database: 'metrics' } as any,
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

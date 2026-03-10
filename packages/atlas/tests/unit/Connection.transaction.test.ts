import { describe, expect, mock, test } from 'bun:test'
import { Connection } from '../../src/connection/Connection'
import type { ConnectionConfig } from '../../src/types'

describe('Connection Transaction', () => {
  test('should use driver.runTransaction if available', async () => {
    const mockRunTransaction = mock(async (cb: any) => {
      return await cb()
    })

    const mockDriver = {
      getDriverName: () => 'postgres',
      connect: async () => {},
      disconnect: async () => {},
      isConnected: () => true,
      beginTransaction: mock(async () => {}),
      commit: mock(async () => {}),
      rollback: mock(async () => {}),
      inTransaction: () => false,
      runTransaction: mockRunTransaction,
      query: mock(async () => ({ rows: [], rowCount: 0 })),
      execute: mock(async () => ({ affectedRows: 0 })),
    }

    const config: ConnectionConfig = {
      driver: 'postgres',
      database: 'test',
    }

    // @ts-expect-error - overriding internal driver for testing
    const conn = new Connection('test', config)
    // @ts-expect-error
    conn.driver = mockDriver
    // @ts-expect-error
    conn.connected = true

    const result = await conn.transaction(async (trx) => {
      await trx.execute('INSERT INTO users VALUES (1)')
      return 'success'
    })

    expect(result).toBe('success')
    expect(mockRunTransaction).toHaveBeenCalled()
    expect(mockDriver.beginTransaction).not.toHaveBeenCalled()
    expect(mockDriver.commit).not.toHaveBeenCalled()
  })

  test('should fallback to procedural transactions if runTransaction is not available', async () => {
    const mockDriver = {
      getDriverName: () => 'postgres',
      connect: async () => {},
      disconnect: async () => {},
      isConnected: () => true,
      beginTransaction: mock(async () => {}),
      commit: mock(async () => {}),
      rollback: mock(async () => {}),
      inTransaction: () => false,
      query: mock(async () => ({ rows: [], rowCount: 0 })),
      execute: mock(async () => ({ affectedRows: 0 })),
    }

    const config: ConnectionConfig = {
      driver: 'postgres',
      database: 'test',
    }

    // @ts-expect-error - overriding internal driver for testing
    const conn = new Connection('test', config)
    // @ts-expect-error
    conn.driver = mockDriver
    // @ts-expect-error
    conn.connected = true

    const result = await conn.transaction(async (trx) => {
      await trx.execute('INSERT INTO users VALUES (1)')
      return 'success'
    })

    expect(result).toBe('success')
    expect(mockDriver.beginTransaction).toHaveBeenCalled()
    expect(mockDriver.commit).toHaveBeenCalled()
  })
})

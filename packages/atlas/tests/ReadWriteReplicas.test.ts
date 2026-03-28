/**
 * Tests: Read/Write Replicas
 * @description Unit tests for ReplicaConnectionPool and ConnectionManager replica routing.
 */

import { describe, expect, it } from 'bun:test'
import { ConnectionManager } from '../src/connection/ConnectionManager'
import { ReplicaConnectionPool } from '../src/connection/ReplicaConnectionPool'
import type { ConnectionContract } from '../src/types'

// ============================================================================
// Helpers: Mock Connection
// ============================================================================

function makeMockConnection(name: string): ConnectionContract {
  return {
    __name: name,
    disconnect: async () => {},
    raw: async () => ({ rows: [], rowCount: 0 }),
    query: async () => ({ rows: [], rowCount: 0 }),
    execute: async () => ({ rows: [], affectedRows: 0 }),
    transaction: async (cb: any) => cb(null),
    getDriver: () => ({
      getDriverName: () => 'postgres',
      query: async () => ({ rows: [] }),
      execute: async () => ({ rows: [], affectedRows: 0 }),
    }),
    table: () => null as any,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    setProxy: () => {},
    getProxy: () => null,
    isConnected: () => true,
  } as unknown as ConnectionContract
}

// ============================================================================
// ReplicaConnectionPool Tests
// ============================================================================

describe('ReplicaConnectionPool', () => {
  describe('getWriteConnection()', () => {
    it('always returns the write connection', () => {
      const write = makeMockConnection('write')
      const read1 = makeMockConnection('read1')
      const pool = new ReplicaConnectionPool(write, [read1])

      expect(pool.getWriteConnection()).toBe(write)
    })
  })

  describe('getReadConnection() - Round-robin', () => {
    it('returns the write connection when no replicas are configured', () => {
      const write = makeMockConnection('write')
      const pool = new ReplicaConnectionPool(write, [])

      expect(pool.getReadConnection()).toBe(write)
    })

    it('returns the single replica when only one is configured', () => {
      const write = makeMockConnection('write')
      const read = makeMockConnection('read')
      const pool = new ReplicaConnectionPool(write, [read])

      expect(pool.getReadConnection()).toBe(read)
      expect(pool.getReadConnection()).toBe(read)
    })

    it('distributes reads across replicas in round-robin order', () => {
      const write = makeMockConnection('write')
      const read1 = makeMockConnection('read1')
      const read2 = makeMockConnection('read2')
      const read3 = makeMockConnection('read3')
      const pool = new ReplicaConnectionPool(write, [read1, read2, read3])

      // Reset index for deterministic test
      pool._resetIndex()

      const r1 = pool.getReadConnection()
      const r2 = pool.getReadConnection()
      const r3 = pool.getReadConnection()
      const r4 = pool.getReadConnection() // Should wrap back to read1

      expect(r1).toBe(read1)
      expect(r2).toBe(read2)
      expect(r3).toBe(read3)
      expect(r4).toBe(read1)
    })

    it('never returns the write connection when replicas exist', () => {
      const write = makeMockConnection('write')
      const read1 = makeMockConnection('read1')
      const read2 = makeMockConnection('read2')
      const pool = new ReplicaConnectionPool(write, [read1, read2])

      for (let i = 0; i < 20; i++) {
        const conn = pool.getReadConnection()
        expect(conn).not.toBe(write)
      }
    })
  })

  describe('hasReplicas()', () => {
    it('returns false when no replicas are configured', () => {
      const pool = new ReplicaConnectionPool(makeMockConnection('write'), [])
      expect(pool.hasReplicas()).toBe(false)
    })

    it('returns true when replicas are configured', () => {
      const pool = new ReplicaConnectionPool(makeMockConnection('write'), [
        makeMockConnection('r1'),
      ])
      expect(pool.hasReplicas()).toBe(true)
    })
  })

  describe('replicaCount()', () => {
    it('returns the correct replica count', () => {
      const pool = new ReplicaConnectionPool(makeMockConnection('w'), [
        makeMockConnection('r1'),
        makeMockConnection('r2'),
      ])
      expect(pool.replicaCount()).toBe(2)
    })
  })

  describe('disconnectAll()', () => {
    it('disconnects write and all replicas', async () => {
      const disconnected: string[] = []
      const makeTracked = (name: string): ConnectionContract =>
        ({
          ...makeMockConnection(name),
          disconnect: async () => {
            disconnected.push(name)
          },
        }) as unknown as ConnectionContract

      const pool = new ReplicaConnectionPool(makeTracked('write'), [
        makeTracked('r1'),
        makeTracked('r2'),
      ])

      await pool.disconnectAll()

      expect(disconnected).toContain('write')
      expect(disconnected).toContain('r1')
      expect(disconnected).toContain('r2')
      expect(disconnected.length).toBe(3)
    })
  })
})

// ============================================================================
// ConnectionManager: disconnect() replica pool cleanup
// ============================================================================

describe('ConnectionManager.disconnect() - replica pool cleanup', () => {
  /**
   * Build a ConnectionManager with a pre-registered read/write replica config,
   * but bypass real DB by injecting mock connections directly into internal maps.
   *
   * We test the disconnect() method to ensure both the write connection AND the
   * replica pool are removed, preventing TCP connection leaks.
   */
  function makeTrackedMock(name: string, log: string[]): ConnectionContract {
    return {
      ...makeMockConnection(name),
      disconnect: async () => {
        log.push(name)
      },
    } as unknown as ConnectionContract
  }

  it('cleans up replica pool from replicaPools map after disconnect()', async () => {
    const manager = new ConnectionManager()
    manager.stopCleanup()

    const disconnected: string[] = []
    const writeConn = makeTrackedMock('write', disconnected)
    const read1 = makeTrackedMock('read1', disconnected)
    const read2 = makeTrackedMock('read2', disconnected)

    // Inject connections directly into internal maps (bypassing DB driver)
    const pool = new ReplicaConnectionPool(writeConn, [read1, read2])
    // @ts-expect-error - access private maps for test setup
    manager.connections.set('default', writeConn)
    // @ts-expect-error - access private maps for test setup
    manager.replicaPools.set('default', pool)
    // @ts-expect-error - access private maps for test setup
    manager.lastUsed.set('default', Date.now())

    // Verify initial state
    // @ts-expect-error - access private maps for test setup
    expect(manager.replicaPools.has('default')).toBe(true)
    // @ts-expect-error - access private maps for test setup
    expect(manager.connections.has('default')).toBe(true)
    // @ts-expect-error - access private maps for test setup
    expect(manager.lastUsed.has('default')).toBe(true)

    await manager.disconnect()

    // After disconnect, write + all replicas should have been disconnected
    expect(disconnected).toContain('write')
    expect(disconnected).toContain('read1')
    expect(disconnected).toContain('read2')
    expect(disconnected.length).toBe(3)

    // All maps should be cleaned up
    // @ts-expect-error - access private maps for test setup
    expect(manager.replicaPools.has('default')).toBe(false)
    // @ts-expect-error - access private maps for test setup
    expect(manager.connections.has('default')).toBe(false)
    // @ts-expect-error - access private maps for test setup
    expect(manager.lastUsed.has('default')).toBe(false)
  })

  it('cleans up replica pool for named connection', async () => {
    const manager = new ConnectionManager()
    manager.stopCleanup()

    const disconnected: string[] = []
    const writeConn = makeTrackedMock('write', disconnected)
    const readConn = makeTrackedMock('read1', disconnected)
    const pool = new ReplicaConnectionPool(writeConn, [readConn])

    // @ts-expect-error - access private maps for test setup
    manager.connections.set('primary', writeConn)
    // @ts-expect-error - access private maps for test setup
    manager.replicaPools.set('primary', pool)
    // @ts-expect-error - access private maps for test setup
    manager.lastUsed.set('primary', Date.now())

    await manager.disconnect('primary')

    expect(disconnected).toContain('write')
    expect(disconnected).toContain('read1')
    // @ts-expect-error - access private maps for test setup
    expect(manager.replicaPools.has('primary')).toBe(false)
    // @ts-expect-error - access private maps for test setup
    expect(manager.lastUsed.has('primary')).toBe(false)
  })

  it('does not error when disconnecting a connection without replica pool', async () => {
    const manager = new ConnectionManager()
    manager.stopCleanup()

    const disconnected: string[] = []
    const conn = makeTrackedMock('standalone', disconnected)

    // @ts-expect-error - access private maps for test setup
    manager.connections.set('default', conn)
    // @ts-expect-error - access private maps for test setup
    manager.lastUsed.set('default', Date.now())

    // No replica pool set — should not throw
    await expect(manager.disconnect()).resolves.toBeUndefined()

    expect(disconnected).toContain('standalone')
    // @ts-expect-error - access private maps for test setup
    expect(manager.lastUsed.has('default')).toBe(false)
  })
})

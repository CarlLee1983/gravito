/**
 * Connection Stream Query Tests
 * @description Tests for stream query functionality in Connection
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Connection } from '../../src/connection/Connection'
import type { DriverContract } from '../../src/types'

describe('Connection Stream Query Support', () => {
  let connection: Connection
  let mockDriver: DriverContract

  beforeEach(() => {
    // Create mock driver
    mockDriver = {
      getDriverName: () => 'postgres' as const,
      connect: mock(async () => {}),
      disconnect: mock(async () => {}),
      isConnected: () => true,
      query: mock(async () => ({
        rows: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
          { id: 3, name: 'User 3' },
        ],
        rowCount: 3,
      })),
      execute: mock(async () => ({
        affectedRows: 1,
      })),
      beginTransaction: mock(async () => {}),
      commit: mock(async () => {}),
      rollback: mock(async () => {}),
      inTransaction: () => false,
      stream: mock(async function* () {
        yield { id: 1, name: 'User 1' }
        yield { id: 2, name: 'User 2' }
        yield { id: 3, name: 'User 3' }
      }),
      getPoolStats: mock(() => ({
        idle: 2,
        pending: 0,
        active: 3,
        total: 5,
        max: 10,
      })),
    }

    connection = new Connection('test', {
      driver: 'postgres',
      database: 'test_db',
    })

    // Replace driver with mock
    ;(connection as any).driver = mockDriver
    ;(connection as any).connected = true
  })

  afterEach(async () => {
    await connection.disconnect()
  })

  describe('stream()', () => {
    it('應該使用驅動的原生串流方法', async () => {
      const results: any[] = []

      for await (const row of connection.stream('SELECT * FROM users')) {
        results.push(row)
      }

      expect(mockDriver.stream).toHaveBeenCalledWith('SELECT * FROM users', [])
      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ id: 1, name: 'User 1' })
    })

    it('應該支援參數綁定', async () => {
      const results: any[] = []

      for await (const row of connection.stream('SELECT * FROM users WHERE id = ?', [1])) {
        results.push(row)
      }

      expect(mockDriver.stream).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1])
    })

    it('如果驅動不支援串流，應該使用 fallback', async () => {
      // Remove stream method from driver
      delete (mockDriver as any).stream

      const results: any[] = []

      for await (const row of connection.stream('SELECT * FROM users')) {
        results.push(row)
      }

      // Should use query() as fallback
      expect(mockDriver.query).toHaveBeenCalled()
      expect(results).toHaveLength(3)
    })
  })

  describe('getPoolStats()', () => {
    it('應該返回連線池統計資訊', () => {
      const stats = connection.getPoolStats()

      expect(stats).toBeDefined()
      expect(stats?.idle).toBe(2)
      expect(stats?.active).toBe(3)
      expect(stats?.total).toBe(5)
      expect(stats?.max).toBe(10)
    })

    it('如果驅動不支援，應該返回 null', () => {
      // Remove getPoolStats method from driver
      delete (mockDriver as any).getPoolStats

      const stats = connection.getPoolStats()

      expect(stats).toBeNull()
    })
  })
})

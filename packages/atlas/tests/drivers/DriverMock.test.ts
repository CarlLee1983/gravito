/**
 * @gravito/atlas - Driver Mock Tests
 */

import { beforeEach, describe, expect, it, vi } from 'bun:test'
import { MySQLDriver } from '../../src/drivers/MySQLDriver'
import { PostgresDriver } from '../../src/drivers/PostgresDriver'

describe('Driver Mock Tests', () => {
  describe('MySQLDriver', () => {
    let driver: MySQLDriver
    let mockPool: any
    let mockConn: any

    beforeEach(() => {
      mockConn = {
        execute: vi.fn(),
        release: vi.fn(),
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
      }
      mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConn),
        execute: vi.fn(),
        end: vi.fn(),
      }
      driver = new MySQLDriver({ driver: 'mysql' })
      // Inject mock pool
      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true
    })

    it('should execute query via pool connection', async () => {
      mockConn.execute.mockResolvedValue([[{ id: 1, name: 'test' }], []])

      const result = await driver.query('SELECT * FROM users')

      expect(mockConn.execute).toHaveBeenCalled()
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].name).toBe('test')
      expect(mockConn.release).toHaveBeenCalled()
    })

    it('should handle transactions', async () => {
      await driver.beginTransaction()
      expect(mockPool.getConnection).toHaveBeenCalled()
      expect(mockConn.beginTransaction).toHaveBeenCalled()

      await driver.commit()
      expect(mockConn.commit).toHaveBeenCalled()
      expect(mockConn.release).toHaveBeenCalled()
    })

    it('should handle rollback', async () => {
      await driver.beginTransaction()
      await driver.rollback()
      expect(mockConn.rollback).toHaveBeenCalled()
    })

    it('should execute write operations and return affected rows', async () => {
      mockConn.execute.mockResolvedValue([{ affectedRows: 1, insertId: 42 }, []])
      const result = await driver.execute('INSERT INTO users...')
      expect(result.affectedRows).toBe(1)
      expect(result.insertId).toBe(42)
    })

    it('should normalize errors', async () => {
      const dbError = new Error('Table not found')
      ;(dbError as any).errno = 1146
      mockConn.execute.mockRejectedValue(dbError)

      try {
        await driver.query('SELECT * FROM non_existent')
      } catch (e: any) {
        expect(e.name).toBe('TableNotFoundError')
      }
    })

    it('should return pool stats', () => {
      ;(driver as any).pool = {
        _allConnections: [{}, {}],
        _freeConnections: [{}],
        _acquiringConnections: [],
      }
      const stats = driver.getPoolStats()
      expect(stats?.total).toBe(2)
      expect(stats?.idle).toBe(1)
      expect(stats?.active).toBe(1)
    })
  })

  describe('PostgresDriver', () => {
    let driver: PostgresDriver
    let mockPool: any
    let mockClient: any

    beforeEach(() => {
      mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      }
      mockPool = {
        connect: vi.fn().mockResolvedValue(mockClient),
        query: vi.fn(),
        end: vi.fn(),
      }
      driver = new PostgresDriver({ driver: 'postgres' })
      ;(driver as any).pool = mockPool
      ;(driver as any).connected = true
    })

    it('should execute query via pool client', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 })

      const result = await driver.query('SELECT 1')

      expect(mockClient.query).toHaveBeenCalled()
      expect(result.rows).toHaveLength(1)
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should handle write operations', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 100 }] })
      const result = await driver.execute('INSERT INTO...')
      expect(result.affectedRows).toBe(1)
      expect(result.insertId).toBe(100)
    })

    it('should normalize postgres errors', async () => {
      const dbError = new Error('Unique violation')
      ;(dbError as any).code = '23505'
      mockClient.query.mockRejectedValue(dbError)

      try {
        await driver.query('INSERT...')
      } catch (e: any) {
        expect(e.name).toBe('UniqueConstraintError')
      }
    })
  })
})

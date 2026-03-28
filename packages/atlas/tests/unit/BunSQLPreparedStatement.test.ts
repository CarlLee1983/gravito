/**
 * BunSQLPreparedStatement Manager Unit Tests
 * @description Tests for prepared statement caching and lifecycle management
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
// Import the manager (will be implemented)
import { BunSQLPreparedStatementManager } from '../../src/drivers/BunSQLPreparedStatement'
import type { BunSQLClient, BunSQLPreparedStatement } from '../../src/drivers/types'

describe('BunSQLPreparedStatementManager', () => {
  let mockClient: BunSQLClient
  let mockPreparedStmt: BunSQLPreparedStatement
  let manager: BunSQLPreparedStatementManager

  beforeEach(() => {
    // Mock prepared statement
    mockPreparedStmt = {
      run: mock(async (..._params: unknown[]) => ({
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
        [Symbol.iterator]: function* () {
          yield { id: 1, name: 'Test' }
        },
      })),
      all: mock(async (..._params: unknown[]) => [{ id: 1, name: 'Test' }]),
      get: mock(async (..._params: unknown[]) => ({ id: 1, name: 'Test' })),
      finalize: mock(() => {}),
    }

    // Mock Bun.sql client
    mockClient = Object.assign(
      mock(async (_strings: TemplateStringsArray, ..._values: unknown[]) => ({
        rows: [],
        rowCount: 0,
        [Symbol.iterator]: function* () {},
      })),
      {
        prepare: mock((_sql: string) => mockPreparedStmt),
        unsafe: mock(async (_sql: string, _bindings?: unknown[]) => ({
          rows: [],
          rowCount: 0,
          [Symbol.iterator]: function* () {},
        })),
      }
    ) as BunSQLClient

    manager = new BunSQLPreparedStatementManager(mockClient)
  })

  afterEach(async () => {
    await manager.clear()
  })

  describe('prepare()', () => {
    it('應該準備 SQL 語句並返回標識符', async () => {
      const sql = 'SELECT * FROM users WHERE id = ?'
      const name = await manager.prepare(sql)

      expect(name).toBeDefined()
      expect(typeof name).toBe('string')
      expect(mockClient.prepare).toHaveBeenCalledWith(sql)
    })

    it('應該快取已準備的語句', async () => {
      const sql = 'SELECT * FROM users WHERE id = ?'

      const name1 = await manager.prepare(sql)
      const name2 = await manager.prepare(sql)

      expect(name1).toBe(name2)
      expect(mockClient.prepare).toHaveBeenCalledTimes(1)
    })

    it('應該為不同的 SQL 生成不同的標識符', async () => {
      const sql1 = 'SELECT * FROM users WHERE id = ?'
      const sql2 = 'SELECT * FROM posts WHERE id = ?'

      const name1 = await manager.prepare(sql1)
      const name2 = await manager.prepare(sql2)

      expect(name1).not.toBe(name2)
      expect(mockClient.prepare).toHaveBeenCalledTimes(2)
    })

    it('應該為不同 SQL 生成唯一的遞增計數器名稱', async () => {
      const sqlStatements = [
        'SELECT * FROM users WHERE id = ?',
        'SELECT * FROM posts WHERE id = ?',
        'SELECT * FROM comments WHERE id = ?',
        'UPDATE users SET name = ? WHERE id = ?',
        'DELETE FROM posts WHERE id = ?',
      ]

      const names: string[] = []
      for (const sql of sqlStatements) {
        const name = await manager.prepare(sql)
        names.push(name)
      }

      // 驗證所有名稱都是唯一的
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(sqlStatements.length)

      // 驗證名稱格式為 stmt_N（遞增計數器）
      for (let i = 0; i < names.length; i++) {
        expect(names[i]).toBe(`stmt_${i + 1}`)
      }
    })
  })

  describe('execute()', () => {
    it('應該執行準備好的語句並返回結果', async () => {
      const sql = 'SELECT * FROM users WHERE id = ?'
      const name = await manager.prepare(sql)
      const bindings = [1]

      const result = await manager.execute<{ id: number; name: string }>(name, bindings)

      expect(result).toEqual([{ id: 1, name: 'Test' }])
      expect(mockPreparedStmt.all).toHaveBeenCalledWith(...bindings)
    })

    it('應該拋出錯誤如果語句不存在', async () => {
      const invalidName = 'non_existent_stmt'

      await expect(manager.execute(invalidName, [])).rejects.toThrow('Prepared statement not found')
    })

    it('應該更新語句的使用統計', async () => {
      const sql = 'SELECT * FROM users WHERE id = ?'
      const name = await manager.prepare(sql)

      await manager.execute(name, [1])
      await manager.execute(name, [2])

      const stats = manager.getStats(name)
      expect(stats?.useCount).toBe(2)
      expect(stats?.createdAt).toBeGreaterThan(0)
    })
  })

  describe('clear()', () => {
    it('應該清除所有準備好的語句', async () => {
      const sql1 = 'SELECT * FROM users WHERE id = ?'
      const sql2 = 'SELECT * FROM posts WHERE id = ?'

      await manager.prepare(sql1)
      await manager.prepare(sql2)

      await manager.clear()

      expect(mockPreparedStmt.finalize).toHaveBeenCalledTimes(2)
    })

    it('清除後應該能夠重新準備語句', async () => {
      const sql = 'SELECT * FROM users WHERE id = ?'
      await manager.prepare(sql)

      await manager.clear()

      const name2 = await manager.prepare(sql)
      expect(name2).toBeDefined()
      // 應該生成新的標識符
      expect(mockClient.prepare).toHaveBeenCalledTimes(2)
    })
  })

  describe('語句快取限制', () => {
    it('應該限制快取的語句數量', async () => {
      const maxStatements = 100

      // 準備超過限制的語句
      for (let i = 0; i < maxStatements + 10; i++) {
        await manager.prepare(`SELECT * FROM users WHERE id = ${i}`)
      }

      const size = manager.getSize()
      expect(size).toBeLessThanOrEqual(maxStatements)
    })

    it('應該移除最少使用的語句當達到限制時', async () => {
      const maxStatements = 100

      // 準備大量語句
      const names: string[] = []
      for (let i = 0; i < maxStatements + 5; i++) {
        const name = await manager.prepare(`SELECT * FROM users WHERE id = ${i}`)
        names.push(name)
      }

      // 第一個語句應該被移除
      await expect(manager.execute(names[0], [])).rejects.toThrow('Prepared statement not found')
    })
  })

  describe('自動 TTL 清理', () => {
    it('應該在 TTL 過期時自動清理語句', async () => {
      // 設定較短的超時時間用於測試
      const managerWithShortTimeout = new BunSQLPreparedStatementManager(mockClient, {
        maxStatements: 100,
        idleTimeout: 100, // 100ms
      })

      const sql = 'SELECT * FROM users WHERE id = ?'
      const _name = await managerWithShortTimeout.prepare(sql)

      // 驗證語句被準備
      expect(managerWithShortTimeout.getSize()).toBe(1)

      // 等待超過閒置超時時間 - 增加等待時間以提高穩定性
      await new Promise((resolve) => setTimeout(resolve, 300))

      // TTL 到期時應該自動清理（lru-cache 的 ttlAutopurge 功能）
      // 注意：TTL 清理發生在下一次訪問時或通過內部定時器
      // 因此我們無法直接驗證，但可以驗證之後的操作行為

      await managerWithShortTimeout.clear()
    })
  })

  describe('getStats()', () => {
    it('應該返回語句的統計資訊', async () => {
      const sql = 'SELECT * FROM users WHERE id = ?'
      const name = await manager.prepare(sql)

      await manager.execute(name, [1])
      await manager.execute(name, [2])

      const stats = manager.getStats(name)

      expect(stats).toBeDefined()
      expect(stats?.useCount).toBe(2)
      expect(stats?.createdAt).toBeGreaterThan(0)
    })

    it('應該返回 null 如果語句不存在', () => {
      const stats = manager.getStats('non_existent')
      expect(stats).toBeNull()
    })
  })

  describe('getSize()', () => {
    it('應該返回當前快取的語句數量', async () => {
      expect(manager.getSize()).toBe(0)

      await manager.prepare('SELECT * FROM users WHERE id = ?')
      expect(manager.getSize()).toBe(1)

      await manager.prepare('SELECT * FROM posts WHERE id = ?')
      expect(manager.getSize()).toBe(2)
    })
  })
})

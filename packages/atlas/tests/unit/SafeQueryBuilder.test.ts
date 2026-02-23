/**
 * SafeQueryBuilder Unit Tests
 * @description 測試 tagged template literal 安全查詢建構器
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { ConnectionContract } from '../../src/connection/Connection'
import { identifier, SafeIdentifier, SafeQueryBuilder } from '../../src/query/SafeQueryBuilder'
import type { DriverContract, QueryResult } from '../../src/types'

describe('SafeIdentifier', () => {
  describe('建構器驗證', () => {
    it('應該接受合法的識別符', () => {
      expect(() => new SafeIdentifier('users')).not.toThrow()
      expect(() => new SafeIdentifier('user_profiles')).not.toThrow()
      expect(() => new SafeIdentifier('_internal')).not.toThrow()
    })

    it('應該接受含點號的限定識別符', () => {
      expect(() => new SafeIdentifier('public.users')).not.toThrow()
      expect(() => new SafeIdentifier('db.schema.users')).not.toThrow()
    })

    it('應該拒絕以數字開頭的識別符', () => {
      expect(() => new SafeIdentifier('123users')).toThrow()
    })

    it('應該拒絕包含特殊字元的識別符', () => {
      expect(() => new SafeIdentifier('users;')).toThrow()
      expect(() => new SafeIdentifier('users--')).toThrow()
      expect(() => new SafeIdentifier('users/*')).toThrow()
      expect(() => new SafeIdentifier("users'")).toThrow()
      expect(() => new SafeIdentifier('users"')).toThrow()
    })

    it('應該拒絕包含空格的識別符', () => {
      expect(() => new SafeIdentifier('user profiles')).toThrow()
    })
  })

  describe('toString()', () => {
    it('應該返回識別符名稱', () => {
      const id = new SafeIdentifier('users')
      expect(id.toString()).toBe('users')
    })
  })
})

describe('identifier() 工廠函數', () => {
  it('應該建立 SafeIdentifier', () => {
    const id = identifier('users')
    expect(id).toBeInstanceOf(SafeIdentifier)
    expect(id.toString()).toBe('users')
  })

  it('應該傳遞驗證到建構器', () => {
    expect(() => identifier('valid_name')).not.toThrow()
    expect(() => identifier('123invalid')).toThrow()
  })
})

describe('SafeQueryBuilder', () => {
  let mockDriver: DriverContract
  let mockConnection: ConnectionContract

  beforeEach(() => {
    // Mock Driver
    mockDriver = {
      getDriverName: mock(() => 'postgres'),
      getPoolStats: mock(() => null),
    } as unknown as DriverContract

    // Mock Connection
    mockConnection = {
      getDriver: mock(() => mockDriver),
      raw: mock(async (sql: string, bindings: unknown[]) => ({
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
        insertId: undefined,
      })),
    } as unknown as ConnectionContract
  })

  describe('compile() - SQL 編譯', () => {
    it('應該生成 Postgres 佔位符 ($1, $2)', () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ' AND name = ', ''] as unknown as TemplateStringsArray,
        [123, 'Alice']
      )

      const { sql, bindings } = builder.compile('postgres')

      expect(sql).toBe('SELECT * FROM users WHERE id = $1 AND name = $2')
      expect(bindings).toEqual([123, 'Alice'])
    })

    it('應該生成 MySQL 佔位符 (?)', () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ' AND name = ', ''] as unknown as TemplateStringsArray,
        [123, 'Alice']
      )

      const { sql, bindings } = builder.compile('mysql')

      expect(sql).toBe('SELECT * FROM users WHERE id = ? AND name = ?')
      expect(bindings).toEqual([123, 'Alice'])
    })

    it('應該生成 SQLite 佔位符 (?)', () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [123]
      )

      const { sql, bindings } = builder.compile('sqlite')

      expect(sql).toBe('SELECT * FROM users WHERE id = ?')
      expect(bindings).toEqual([123])
    })

    it('應該內聯 SafeIdentifier（不使用參數綁定）', () => {
      const tableName = identifier('users')
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM ', ''] as unknown as TemplateStringsArray,
        [tableName]
      )

      const { sql, bindings } = builder.compile('postgres')

      expect(sql).toBe('SELECT * FROM users')
      expect(bindings).toEqual([])
    })

    it('應該正確處理混合 SafeIdentifier 和普通值', () => {
      const tableName = identifier('users')
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM ', ' WHERE id = ', ''] as unknown as TemplateStringsArray,
        [tableName, 123]
      )

      const { sql, bindings } = builder.compile('postgres')

      expect(sql).toBe('SELECT * FROM users WHERE id = $1')
      expect(bindings).toEqual([123])
    })

    it('應該處理無插值的純 SQL', () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users'] as unknown as TemplateStringsArray,
        []
      )

      const { sql, bindings } = builder.compile()

      expect(sql).toBe('SELECT * FROM users')
      expect(bindings).toEqual([])
    })

    it('應該返回可變的 bindings 陣列', () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [123]
      )

      const { bindings } = builder.compile()

      expect(Array.isArray(bindings)).toBe(true)
      expect(bindings).toEqual([123])
    })
  })

  describe('using() - 連線綁定', () => {
    it('應該綁定連線', () => {
      const builder = new SafeQueryBuilder(['SELECT 1'] as unknown as TemplateStringsArray, [])

      const bound = builder.using(mockConnection)

      expect(bound).toBeInstanceOf(SafeQueryBuilder)
    })

    it('應該支援方法鏈', () => {
      const builder = new SafeQueryBuilder(['SELECT 1'] as unknown as TemplateStringsArray, [])

      const result = builder.using(mockConnection)

      expect(result).toBeDefined()
    })
  })

  describe('execute()', () => {
    it('應該執行查詢並返回完整結果', async () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      ).using(mockConnection)

      const result = await builder.execute()

      expect(result).toBeDefined()
      expect(result.rows).toEqual([{ id: 1, name: 'test' }])
      expect(mockConnection.raw).toHaveBeenCalled()
    })

    it('未綁定連線時應拋出錯誤', async () => {
      const builder = new SafeQueryBuilder(['SELECT 1'] as unknown as TemplateStringsArray, [])

      await expect(builder.execute()).rejects.toThrow('No connection bound')
    })

    it('應該使用正確的方言編譯 SQL', async () => {
      mockDriver.getDriverName = mock(() => 'mysql')

      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      ).using(mockConnection)

      await builder.execute()

      const callArgs = (mockConnection.raw as any).mock.calls[0]
      expect(callArgs[0]).toBe('SELECT * FROM users WHERE id = ?')
    })
  })

  describe('all()', () => {
    it('應該執行查詢並返回所有行', async () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users'] as unknown as TemplateStringsArray,
        []
      ).using(mockConnection)

      const rows = await builder.all()

      expect(Array.isArray(rows)).toBe(true)
      expect(rows).toEqual([{ id: 1, name: 'test' }])
    })
  })

  describe('first()', () => {
    it('應該返回第一行', async () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      ).using(mockConnection)

      const row = await builder.first()

      expect(row).toEqual({ id: 1, name: 'test' })
    })

    it('無結果時應返回 null', async () => {
      // 重新建立 mock 回傳空結果
      mockConnection.raw = mock(async () => ({
        rows: [],
        rowCount: 0,
        insertId: undefined,
      })) as any

      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [999]
      ).using(mockConnection)

      const row = await builder.first()

      expect(row).toBeNull()
    })
  })

  describe('toExpression()', () => {
    it('應該轉換為 Expression', () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      )

      const expr = builder.toExpression()

      expect(expr).toBeDefined()
      // Expression 物件應包含 SQL 和 bindings
      expect(expr.toString()).toBeDefined()
    })
  })

  describe('方言偵測', () => {
    it('應該偵測 Postgres', async () => {
      mockDriver.getDriverName = mock(() => 'postgres')

      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      ).using(mockConnection)

      await builder.execute()

      const callArgs = (mockConnection.raw as any).mock.calls[0]
      expect(callArgs[0]).toContain('$1')
    })

    it('應該偵測 SQLite', async () => {
      mockDriver.getDriverName = mock(() => 'sqlite')

      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      ).using(mockConnection)

      await builder.execute()

      const callArgs = (mockConnection.raw as any).mock.calls[0]
      expect(callArgs[0]).toContain('?')
    })

    it('應該偵測 MySQL', async () => {
      mockDriver.getDriverName = mock(() => 'mysql')

      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      ).using(mockConnection)

      await builder.execute()

      const callArgs = (mockConnection.raw as any).mock.calls[0]
      expect(callArgs[0]).toContain('?')
    })

    it('應該偵測 MariaDB 為 MySQL', async () => {
      mockDriver.getDriverName = mock(() => 'mariadb')

      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      ).using(mockConnection)

      await builder.execute()

      const callArgs = (mockConnection.raw as any).mock.calls[0]
      expect(callArgs[0]).toContain('?')
    })
  })
})

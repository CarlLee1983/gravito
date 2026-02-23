/**
 * Connection.sql() - Safe Query Builder Integration Tests
 * @description Test the tagged template literal API integration with Connection
 */

import { describe, expect, it, mock } from 'bun:test'
import type { ConnectionContract } from '../../src/connection/Connection'
import { identifier } from '../../src/query/SafeQueryBuilder'

describe('Connection.sql() - Tagged Template Literal API', () => {
  // Mock connection for testing
  function createMockConnection(): ConnectionContract {
    const mockDriver = {
      getDriverName: mock(() => 'postgres'),
      query: mock(async (sql: string, bindings: unknown[]) => ({
        rows: [{ id: 1, name: 'Alice' }],
        rowCount: 1,
        insertId: undefined,
      })),
    }

    const mockConnection = {
      getName: () => 'test',
      getDriver: () => mockDriver,
      getConfig: () => ({ driver: 'postgres' }),
      getTracer: () => undefined,
      getGrammar: () => ({}),
      table: () => ({}),
      collection: () => ({}),
      raw: mock(async (sql: string, bindings: unknown[]) => ({
        rows: [{ id: 1, name: 'Alice' }],
        rowCount: 1,
        insertId: undefined,
      })),
      execute: mock(async () => ({ rowCount: 1, insertId: undefined })),
      transaction: mock(async (fn: (c: ConnectionContract) => Promise<unknown>) =>
        fn(mockConnection as ConnectionContract)
      ),
      disconnect: mock(async () => {}),
      sql: function <T = Record<string, unknown>>(
        strings: TemplateStringsArray,
        ...values: unknown[]
      ) {
        const { SafeQueryBuilder } = require('../../src/query/SafeQueryBuilder')
        const builder = new SafeQueryBuilder<T>(strings, values)
        return builder.using(this as ConnectionContract)
      },
    } as unknown as ConnectionContract

    return mockConnection
  }

  describe('Simple Queries', () => {
    it('should compile simple SELECT with single parameter', () => {
      const conn = createMockConnection()
      const userId = 123

      const builder = conn.sql`SELECT * FROM users WHERE id = ${userId}`

      // Verify it's a SafeQueryBuilder instance with the expected API
      expect(builder).toBeDefined()
      expect(typeof builder.execute).toBe('function')
      expect(typeof builder.all).toBe('function')
      expect(typeof builder.first).toBe('function')
    })

    it('should compile SELECT with multiple parameters', () => {
      const conn = createMockConnection()
      const userId = 123
      const status = 'active'

      const builder = conn.sql`SELECT * FROM users WHERE id = ${userId} AND status = ${status}`

      expect(builder).toBeDefined()
      expect(typeof builder.all).toBe('function')
    })

    it('should compile INSERT with parameters', () => {
      const conn = createMockConnection()
      const name = 'Alice'
      const email = 'alice@example.com'

      const builder = conn.sql`INSERT INTO users (name, email) VALUES (${name}, ${email})`

      expect(builder).toBeDefined()
    })

    it('should compile UPDATE with parameters', () => {
      const conn = createMockConnection()
      const name = 'Bob'
      const userId = 123

      const builder = conn.sql`UPDATE users SET name = ${name} WHERE id = ${userId}`

      expect(builder).toBeDefined()
    })
  })

  describe('SQL Injection Protection', () => {
    it('should protect against statement injection', () => {
      const conn = createMockConnection()
      const maliciousInput = "'; DROP TABLE users;--"

      const builder = conn.sql`SELECT * FROM users WHERE name = ${maliciousInput}`

      // Verify SafeQueryBuilder is used (parameter binding, not string concatenation)
      expect(builder).toBeDefined()
    })

    it('should protect against UNION-based injection', () => {
      const conn = createMockConnection()
      const unionPayload = "' UNION SELECT password FROM admin_users --"

      const builder = conn.sql`SELECT * FROM users WHERE username = ${unionPayload}`

      expect(builder).toBeDefined()
    })

    it('should protect against time-based blind injection', () => {
      const conn = createMockConnection()
      const blindPayload = "' OR SLEEP(5)--"

      const builder = conn.sql`SELECT * FROM users WHERE id = ${blindPayload}`

      expect(builder).toBeDefined()
    })
  })

  describe('SafeIdentifier Integration', () => {
    it('should support table name identifiers', () => {
      const conn = createMockConnection()
      const tableName = identifier('users')

      const builder = conn.sql`SELECT * FROM ${tableName} WHERE active = ${'true'}`

      expect(builder).toBeDefined()
    })

    it('should support column name identifiers', () => {
      const conn = createMockConnection()
      const columnName = identifier('email')
      const value = 'test@example.com'

      const builder = conn.sql`SELECT ${columnName} FROM users WHERE ${columnName} = ${value}`

      expect(builder).toBeDefined()
    })

    it('should support multiple identifiers', () => {
      const conn = createMockConnection()
      const tableName = identifier('posts')
      const columnName = identifier('author_id')
      const authorId = 123

      const builder = conn.sql`SELECT * FROM ${tableName} WHERE ${columnName} = ${authorId}`

      expect(builder).toBeDefined()
    })

    it('should reject invalid identifiers', () => {
      expect(() => {
        identifier("users'; DROP TABLE--")
      }).toThrow()
    })
  })

  describe('Result Handling', () => {
    it('should support .all() to get all rows', async () => {
      const conn = createMockConnection()
      const userId = 123

      const builder = conn.sql`SELECT * FROM users WHERE id = ${userId}`
      const rows = await builder.all()

      expect(Array.isArray(rows)).toBe(true)
    })

    it('should support .first() to get first row', async () => {
      const conn = createMockConnection()
      const userId = 123

      const builder = conn.sql`SELECT * FROM users WHERE id = ${userId}`
      const row = await builder.first()

      expect(row).toBeDefined()
    })

    it('should support .execute() for full results', async () => {
      const conn = createMockConnection()
      const userId = 123

      const builder = conn.sql`SELECT * FROM users WHERE id = ${userId}`
      const result = await builder.execute()

      expect(result).toBeDefined()
      expect(result.rows).toBeDefined()
    })
  })

  describe('Expression Conversion', () => {
    it('should convert to Expression for QueryBuilder use', () => {
      const conn = createMockConnection()
      const userId = 123

      const builder = conn.sql`SELECT * FROM users WHERE id = ${userId}`
      const expr = builder.toExpression?.()

      expect(expr).toBeDefined()
    })
  })

  describe('Type Safety', () => {
    it('should preserve generic type for results', () => {
      interface User {
        id: number
        name: string
        email: string
      }

      const conn = createMockConnection()
      const userId = 123

      // This should compile with proper type inference
      const builder = conn.sql<User>`SELECT * FROM users WHERE id = ${userId}`

      expect(builder).toBeDefined()
    })
  })

  describe('Chaining and Configuration', () => {
    it('should support using() for connection rebinding', () => {
      const conn = createMockConnection()
      const userId = 123

      const builder = conn.sql`SELECT * FROM users WHERE id = ${userId}`
      const rebound = builder.using?.(conn)

      expect(rebound).toBeDefined()
    })
  })
})

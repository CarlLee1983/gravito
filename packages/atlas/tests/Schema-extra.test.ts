import { describe, expect, it } from 'bun:test'
import { DB } from '../src/DB'
import { Schema } from '../src/schema/Schema'
import type { QueryResult } from '../src/types'

describe('Schema facade', () => {
  it('executes schema operations via configured connection', async () => {
    const TEST_CONN = `schema_extra_${Math.random().toString(36).slice(2)}`
    const rawCalls: string[] = []

    const mockConnection: any = {
      getName: () => TEST_CONN,
      getTracer: () => undefined,
      getDriver: () => ({ getDriverName: () => 'postgres' }),
      getConfig: () => ({ driver: 'postgres', database: 'test' }),
      raw: async (sql: string): Promise<QueryResult> => {
        rawCalls.push(sql)
        if (sql.includes('information_schema.columns')) {
          return { rows: [{ count: 1 }], rowCount: 1 }
        }
        if (sql.includes('table_schema')) {
          return { rows: [{ table_name: 'users' }], rowCount: 1 }
        }
        if (sql.includes('information_schema.tables')) {
          return { rows: [{ count: 1 }], rowCount: 1 }
        }
        return { rows: [], rowCount: 0 }
      },
      execute: async () => ({ affectedRows: 1 }),
    }

    const originalConnection = DB.connection
    // @ts-expect-error - mock connection
    DB.connection = (name?: string) => {
      if (name === TEST_CONN) {
        return mockConnection
      }
      return originalConnection.call(DB, name)
    }

    try {
      // Set the connection name on the facade
      Schema.connection(TEST_CONN)

      expect(await Schema.hasTable('users')).toBe(true)
      expect(await Schema.hasColumn('users', 'email')).toBe(true)

      const tables = await Schema.getTables()
      expect(tables).toContain('users')

      await Schema.create('users', (table) => {
        table.id()
        table.string('email')
      })

      await Schema.table('users', (table) => {
        table.string('name')
      })

      await Schema.rename('users', 'accounts')
      await Schema.dropIfExists('accounts')

      expect(rawCalls.length).toBeGreaterThan(0)
    } finally {
      DB.connection = originalConnection
      Schema.reset()
    }
  })
})

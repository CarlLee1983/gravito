import { describe, expect, test } from 'bun:test'
import { column, DB, Model } from '../../src/index'

// biome-ignore lint/correctness/noUnusedVariables: Used in tests via Model.query()
class User extends Model {
  static table = 'users'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
  @column() declare email: string
}

describe('Prepared Statements Test', () => {
  // Use a local DB instance or ensure we reset the global one
  const _ensurePostgres = () => {
    if (!process.env.POSTGRES_URL) {
      return false
    }

    DB.addConnection('postgres_prepared', {
      driver: 'postgres',
      connectionString: process.env.POSTGRES_URL,
    } as any)
    return true
  }

  // We can't easily test PG driver without a real DB.
  // Instead, let's unit test the QueryBuilder integration with a Mock Driver.

  test('QueryBuilder uses prepared statements if supported', async () => {
    let prepareCalled = false
    let executeCalled = false

    const mockDriver = {
      getDriverName: () => 'mock',
      prepare: async (sql: string) => {
        prepareCalled = true
        expect(sql).toContain('SELECT * FROM "users"')
        return 'stmt_1'
      },
      executePrepared: async (name: string, _bindings: any[]) => {
        executeCalled = true
        expect(name).toBe('stmt_1')
        return { rows: [{ id: 1, name: 'Prepared User' }], rowCount: 1 }
      },
      query: async () => ({ rows: [], rowCount: 0 }),
    }

    const connection = {
      getDriver: () => mockDriver,
      raw: async () => ({ rows: [] }),
    }

    const builder = new (require('../../src/query/QueryBuilder').QueryBuilder)(
      connection,
      new (require('../../src/grammar/PostgresGrammar').PostgresGrammar)(),
      'users'
    )

    const result = await builder.getPrepared()

    expect(prepareCalled).toBe(true)
    expect(executeCalled).toBe(true)
    expect(result[0].name).toBe('Prepared User')
  })
})

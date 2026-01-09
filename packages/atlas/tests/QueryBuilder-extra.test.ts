import { describe, expect, it } from 'bun:test'
import { PostgresGrammar } from '../src/grammar/PostgresGrammar'
import { QueryBuilder, RecordNotFoundError } from '../src/query/QueryBuilder'
import type { ConnectionContract, DriverContract, QueryResult } from '../src/types'

function makeBuilder<T = Record<string, unknown>>(
  rawImpl: (sql: string, bindings?: unknown[]) => Promise<QueryResult<T>>,
  executeImpl: (
    sql: string,
    bindings?: unknown[]
  ) => Promise<{ affectedRows: number }> = async () => ({ affectedRows: 1 })
) {
  const grammar = new PostgresGrammar()
  const driver: DriverContract = {
    getDriverName: () => 'postgres',
    connect: async () => {},
    disconnect: async () => {},
    isConnected: () => true,
    query: async () => ({ rows: [], rowCount: 0 }),
    execute: executeImpl,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    inTransaction: () => false,
  }

  const connection: ConnectionContract = {
    getName: () => 'test',
    getDriver: () => driver,
    getConfig: () => ({ driver: 'postgres' as const, database: 'test' }),
    table: <U>(_name: string) => new QueryBuilder<U>(connection, grammar, _name),
    raw: rawImpl,
    transaction: async <U>(callback: (conn: ConnectionContract) => Promise<U>) =>
      callback(connection),
    disconnect: async () => {},
  }

  return new QueryBuilder<T>(connection, grammar, 'users')
}

describe('QueryBuilder execution', () => {
  it('reads records and handles missing results', async () => {
    const builder = makeBuilder(async () => ({ rows: [{ id: 1, name: 'Ada' }], rowCount: 1 }))

    const first = await builder.first()
    expect(first).toMatchObject({ id: 1, name: 'Ada' })

    const missing = makeBuilder(async (sql) => {
      if (sql.includes('WHERE "id" = $1')) {
        return { rows: [], rowCount: 0 }
      }
      return { rows: [{ id: 1, name: 'Ada' }], rowCount: 1 }
    })

    const found = await missing.find(1)
    expect(found).toBeNull()

    await expect(missing.findOrFail(1)).rejects.toBeInstanceOf(RecordNotFoundError)

    const present = makeBuilder(async () => ({ rows: [{ id: 2, name: 'Bee' }], rowCount: 1 }))
    await expect(present.firstOrFail()).resolves.toMatchObject({ id: 2 })
  })

  it('supports value, pluck, and exists helpers', async () => {
    const builder = makeBuilder(async (sql) => {
      if (sql.includes('EXISTS')) {
        return { rows: [{ exists: true }], rowCount: 1 }
      }
      return {
        rows: [
          { id: 1, name: 'Nova' },
          { id: 2, name: 'Lex' },
        ],
        rowCount: 2,
      }
    })

    expect(await builder.value('name')).toBe('Nova')
    expect(await builder.pluck('name')).toEqual(['Nova', 'Lex'])
    expect(await builder.exists()).toBe(true)
    expect(await builder.doesntExist()).toBe(false)
  })

  it('executes aggregates', async () => {
    const builder = makeBuilder(async (sql) => {
      if (sql.includes('COUNT')) {
        return { rows: [{ aggregate: 3 }], rowCount: 1 }
      }
      if (sql.includes('MAX')) {
        return { rows: [{ aggregate: 9 }], rowCount: 1 }
      }
      if (sql.includes('MIN')) {
        return { rows: [{ aggregate: 1 }], rowCount: 1 }
      }
      if (sql.includes('AVG')) {
        return { rows: [{ aggregate: 4 }], rowCount: 1 }
      }
      return { rows: [{ aggregate: 12 }], rowCount: 1 }
    })

    expect(await builder.count()).toBe(3)
    expect(await builder.max('score')).toBe(9)
    expect(await builder.min('score')).toBe(1)
    expect(await builder.avg('score')).toBe(4)
    expect(await builder.sum('score')).toBe(12)
  })

  it('writes data and supports pagination helpers', async () => {
    const builder = makeBuilder(
      async (sql) => {
        if (sql.includes('COUNT')) {
          return { rows: [{ aggregate: 4 }], rowCount: 1 }
        }
        if (sql.includes('RETURNING')) {
          return { rows: [{ id: 7 }], rowCount: 1 }
        }
        if (sql.includes('SELECT')) {
          return { rows: [{ id: 1 }, { id: 2 }], rowCount: 2 }
        }
        return { rows: [{ id: 1 }], rowCount: 1 }
      },
      async () => ({ affectedRows: 2 })
    )

    expect(await builder.insert({ name: 'Ada' })).toEqual([{ id: 7 }])
    expect(await builder.insertGetId({ name: 'Ada' })).toBe(7)
    expect(await builder.update({ name: 'Nova' })).toBe(2)
    expect(await builder.updateJson('settings->theme', 'dark')).toBe(2)
    expect(await builder.delete()).toBe(2)

    await builder.truncate()

    expect(await builder.increment('count', 2, { name: 'Ada' })).toBe(2)
    expect(await builder.decrement('count', 1)).toBe(2)

    const paged = await builder.paginate(2, 1)
    expect(paged.pagination.total).toBe(4)

    const simple = await builder.simplePaginate(2, 2)
    expect(simple.pagination.page).toBe(2)

    let chunked = 0
    await builder.chunk(2, async (rows) => {
      chunked += rows.length
      return false
    })
    expect(chunked).toBeGreaterThan(0)
  })

  it('supports chunked inserts and soft delete helpers', async () => {
    const builder = makeBuilder(
      async (_sql, bindings) => {
        const count = bindings?.length ?? 0
        return { rows: Array.from({ length: count }, (_, i) => ({ id: i })), rowCount: count }
      },
      async () => ({ affectedRows: 1 })
    )

    const large = Array.from({ length: 1001 }, (_, i) => ({ id: i }))
    const inserted = await builder.insert(large)
    expect(inserted.length).toBe(large.length)

    await builder.withTrashed().restore()
    await builder.onlyTrashed().forceDelete()

    const upserted = await builder.upsert({ id: 1 }, 'id')
    expect(upserted).toBe(1)
  })
})

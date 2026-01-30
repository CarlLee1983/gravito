/**
 * QueryBuilder Stream Tests
 * @description Tests for stream functionality in QueryBuilder
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { PostgresGrammar } from '../../src/grammar/PostgresGrammar'
import { QueryBuilder } from '../../src/query/QueryBuilder'
import type { ConnectionContract } from '../../src/types'

describe('QueryBuilder stream()', () => {
  let mockConnection: ConnectionContract
  let grammar: PostgresGrammar
  let builder: QueryBuilder<{ id: number; name: string }>

  beforeEach(() => {
    grammar = new PostgresGrammar()

    // Mock connection with stream support
    mockConnection = {
      getName: () => 'test',
      getConfig: () => ({ driver: 'postgres', database: 'test' }),
      getTracer: () => undefined,
      getDriver: () => ({
        getDriverName: () => 'postgres' as const,
        connect: async () => {},
        disconnect: async () => {},
        isConnected: () => true,
        query: async () => ({ rows: [], rowCount: 0 }),
        execute: async () => ({ affectedRows: 0 }),
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        inTransaction: () => false,
      }),
      getGrammar: () => grammar,
      table: (tableName: string) => new QueryBuilder(mockConnection, grammar, tableName),
      raw: async () => ({ rows: [], rowCount: 0 }),
      execute: async () => ({ affectedRows: 0 }),
      transaction: async (callback) => callback(mockConnection),
      disconnect: async () => {},
      stream: mock(async function* () {
        yield { id: 1, name: 'User 1' }
        yield { id: 2, name: 'User 2' }
        yield { id: 3, name: 'User 3' }
      }),
    }

    builder = new QueryBuilder<{ id: number; name: string }>(mockConnection, grammar, 'users')
  })

  it('應該能夠串流查詢結果', async () => {
    const results: Array<{ id: number; name: string }> = []

    for await (const row of builder.where('active', true).stream()) {
      results.push(row)
    }

    expect(results).toHaveLength(3)
    expect(results[0]).toEqual({ id: 1, name: 'User 1' })
    expect(results[1]).toEqual({ id: 2, name: 'User 2' })
    expect(results[2]).toEqual({ id: 3, name: 'User 3' })
  })

  it('應該正確編譯 SQL 並傳遞參數', async () => {
    const results: any[] = []

    for await (const row of builder.where('id', '>', 10).stream()) {
      results.push(row)
    }

    // Verify stream was called with correct SQL and bindings
    expect(mockConnection.stream).toHaveBeenCalledTimes(1)
    const [sql, bindings] = (mockConnection.stream as any).mock.calls[0]

    expect(sql).toContain('SELECT * FROM "users"')
    expect(sql).toContain('WHERE "id" > $1')
    expect(bindings).toEqual([10])
  })

  it('應該支援複雜查詢條件', async () => {
    const results: any[] = []

    for await (const row of builder
      .where('status', 'active')
      .where('age', '>=', 18)
      .orderBy('created_at', 'desc')
      .limit(100)
      .stream()) {
      results.push(row)
    }

    expect(results).toHaveLength(3)
  })

  it('如果連線不支援串流，應該使用 fallback', async () => {
    // Remove stream method
    delete (mockConnection as any).stream

    // Mock get() to return data
    builder.getRawResults = mock(async () => [
      { id: 1, name: 'User 1' },
      { id: 2, name: 'User 2' },
    ])

    const results: any[] = []

    for await (const row of builder.stream()) {
      results.push(row)
    }

    // Should use get() as fallback
    expect(builder.getRawResults).toHaveBeenCalled()
    expect(results).toHaveLength(2)
  })

  it('應該允許在串流過程中處理每一筆資料', async () => {
    const processedIds: number[] = []

    for await (const user of builder.where('active', true).stream()) {
      // Process each record
      processedIds.push(user.id)

      // Early exit condition
      if (processedIds.length >= 2) {
        break
      }
    }

    expect(processedIds).toEqual([1, 2])
  })

  it('應該支援與 select() 一起使用', async () => {
    const results: any[] = []

    for await (const row of builder.select('id', 'name').where('active', true).stream()) {
      results.push(row)
    }

    const [sql] = (mockConnection.stream as any).mock.calls[0]
    expect(sql).toContain('SELECT "id", "name" FROM "users"')
  })

  it('應該支援與 join() 一起使用', async () => {
    const results: any[] = []

    for await (const row of builder.join('posts', 'users.id', '=', 'posts.user_id').stream()) {
      results.push(row)
    }

    const [sql] = (mockConnection.stream as any).mock.calls[0]
    expect(sql).toContain('INNER JOIN')
  })

  it('串流應該對記憶體友善', async () => {
    // This test conceptually verifies that we're not loading all data at once
    // In practice, the actual memory benefit depends on the driver implementation

    let count = 0
    for await (const _row of builder.stream()) {
      count++
      // Each iteration should only have one row in memory at a time
    }

    expect(count).toBe(3)
  })
})

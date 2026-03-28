import { expect, test } from 'bun:test'
import { Grammar } from '../../src/grammar/Grammar'
import { PostgresGrammar } from '../../src/grammar/PostgresGrammar'

test('cache size limit', () => {
  Grammar.clearCache()
  Grammar.setCacheSize(10)

  // Generate 20 unique queries
  for (let i = 0; i < 20; i++) {
    const query: any = {
      table: `table_${i}`,
      columns: ['*'],
      wheres: [],
      joins: [],
      groups: [],
      havings: [],
      orders: [],
      unions: [],
    }
    const grammar = new PostgresGrammar()
    grammar.compileSelect(query)
  }

  const stats = Grammar.getCacheStats()
  expect(stats.size).toBeLessThanOrEqual(10)
})

test('cache hit rate', () => {
  Grammar.clearCache()
  Grammar.setCacheSize(100)

  const query: any = {
    table: 'users',
    columns: ['id', 'name'],
    wheres: [],
    joins: [],
    groups: [],
    havings: [],
    orders: [],
    unions: [],
  }
  const grammar = new PostgresGrammar()

  // First call - cache miss
  const sql1 = grammar.compileSelect(query)

  // Second call - cache hit
  const sql2 = grammar.compileSelect(query)

  expect(sql1).toBe(sql2)

  const stats = Grammar.getCacheStats()
  expect(stats.size).toBe(1)
})

test('cache key includes unions to prevent collisions', () => {
  Grammar.clearCache()
  Grammar.setCacheSize(100)

  const baseQuery: any = {
    table: 'users',
    columns: ['id', 'name'],
    distinct: false,
    wheres: [],
    joins: [],
    groups: [],
    havings: [],
    orders: [],
    unions: [],
    bindings: [],
  }

  const unionQuery1: any = {
    table: 'orders',
    columns: ['id', 'name'],
    distinct: false,
    wheres: [],
    joins: [],
    groups: [],
    havings: [],
    orders: [],
    unions: [],
    bindings: [],
  }

  const unionQuery2: any = {
    table: 'payments',
    columns: ['id', 'name'],
    distinct: false,
    wheres: [],
    joins: [],
    groups: [],
    havings: [],
    orders: [],
    unions: [],
    bindings: [],
  }

  const queryWithUnion1: any = {
    ...baseQuery,
    unions: [{ query: unionQuery1, all: false }],
  }

  const queryWithUnion2: any = {
    ...baseQuery,
    unions: [{ query: unionQuery2, all: false }],
  }

  const queryWithUnionAll: any = {
    ...baseQuery,
    unions: [{ query: unionQuery1, all: true }],
  }

  const grammar = new PostgresGrammar()

  // Get cache keys for each variant
  const key1 = grammar.getStructuralKey(queryWithUnion1)
  const key2 = grammar.getStructuralKey(queryWithUnion2)
  const keyAll = grammar.getStructuralKey(queryWithUnionAll)
  const keyNoUnion = grammar.getStructuralKey(baseQuery)

  // All keys should be different
  expect(key1).not.toBe(key2)
  expect(key1).not.toBe(keyAll)
  expect(key1).not.toBe(keyNoUnion)
  expect(key2).not.toBe(keyAll)
  expect(key2).not.toBe(keyNoUnion)
  expect(keyAll).not.toBe(keyNoUnion)

  // Compile and verify different SQL is generated
  const sql1 = grammar.compileSelect(queryWithUnion1)
  const sql2 = grammar.compileSelect(queryWithUnion2)
  const sqlAll = grammar.compileSelect(queryWithUnionAll)

  expect(sql1).toContain('UNION')
  expect(sql1).not.toContain('UNION ALL')
  expect(sql2).toContain('UNION')
  expect(sqlAll).toContain('UNION ALL')
  expect(sql1).not.toBe(sql2)
  expect(sql1).not.toBe(sqlAll)
})

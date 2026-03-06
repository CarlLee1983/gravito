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

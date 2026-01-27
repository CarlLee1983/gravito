import { bench, describe } from 'bun:test'
import { Grammar } from '../../src/grammar/Grammar'
import { PostgresGrammar } from '../../src/grammar/PostgresGrammar'

describe('Grammar Compilation Performance', () => {
  const grammar = new PostgresGrammar()
  const query = {
    table: 'users',
    columns: ['id', 'name', 'email'],
    distinct: false,
    wheres: [
      { type: 'basic', column: 'status', operator: '=', value: 'active', boolean: 'and' },
      { type: 'basic', column: 'role', operator: '=', value: 'admin', boolean: 'and' },
    ],
    orders: [{ column: 'created_at', direction: 'desc' }],
    joins: [],
    groups: [],
    havings: [],
    bindings: ['active', 'admin'],
  } as any

  bench('compileSelect (with cache)', () => {
    Grammar.useCache = true
    grammar.compileSelect(query)
  })

  bench('compileSelect (no cache)', () => {
    Grammar.useCache = false
    grammar.compileSelect(query)
  })
})

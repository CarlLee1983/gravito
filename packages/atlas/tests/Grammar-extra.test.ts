import { describe, expect, it } from 'bun:test'
import { MongoGrammar } from '../src/grammar/MongoGrammar'
import { NullGrammar } from '../src/grammar/NullGrammar'

function makeQuery(overrides: Record<string, unknown> = {}) {
  return {
    table: 'users',
    columns: ['id', 'name'],
    distinct: false,
    wheres: [],
    joins: [],
    groups: [],
    havings: [],
    orders: [],
    limit: undefined,
    offset: undefined,
    bindingsList: [],
    ...overrides,
  }
}

describe('MongoGrammar', () => {
  it('compiles select/insert/update/delete into protocol', () => {
    const grammar = new MongoGrammar()
    const id = '507f1f77bcf86cd799439011'
    const query = makeQuery({
      wheres: [
        { type: 'basic', column: 'id', operator: '=', value: id },
        { type: 'in', column: 'status', values: ['active', 'paused'], not: false },
        { type: 'null', column: 'deleted_at', not: false },
      ],
      orders: [{ column: 'name', direction: 'asc' }],
      limit: 5,
      offset: 10,
    })

    const select = JSON.parse(grammar.compileSelect(query as any))
    expect(select).toMatchObject({
      collection: 'users',
      operation: 'find',
      options: { limit: 5, skip: 10, sort: { name: 1 }, projection: { id: 1, name: 1 } },
    })
    expect(select.filter._id).toBe(id)
    expect(select.filter.status).toEqual({ $in: ['active', 'paused'] })
    expect(select.filter.deleted_at).toEqual({ $eq: null })

    const insert = JSON.parse(grammar.compileInsert(query as any, [{ name: 'A' }]))
    expect(insert.operation).toBe('insert')
    expect(insert.document).toEqual([{ name: 'A' }])

    const update = JSON.parse(grammar.compileUpdate(query as any, { name: 'B' }))
    expect(update.operation).toBe('update')
    expect(update.update).toEqual({ $set: { name: 'B' } })

    const del = JSON.parse(grammar.compileDelete(query as any))
    expect(del.operation).toBe('delete')
  })

  it('compiles aggregate count and json path', () => {
    const grammar = new MongoGrammar()
    const query = makeQuery()

    const count = JSON.parse(
      grammar.compileAggregate(query as any, { function: 'count', column: '*' })
    )
    expect(count.operation).toBe('count')

    expect(grammar.compileJsonPath('meta->user->id', 3)).toBe(JSON.stringify({ 'meta.user.id': 3 }))

    expect(() =>
      grammar.compileAggregate(query as any, { function: 'sum', column: 'age' })
    ).toThrow("Aggregate function 'sum' not yet implemented for MongoDB")
  })
})

describe('NullGrammar', () => {
  it('throws for SQL compilation methods and returns simple helpers', () => {
    const grammar = new NullGrammar()
    const query = makeQuery()

    expect(() => grammar.compileSelect(query as any)).toThrow()
    expect(() => grammar.compileInsert(query as any, [])).toThrow()
    expect(() => grammar.compileUpdate(query as any, {})).toThrow()

    expect(grammar.getPlaceholder(0)).toBe('?')
    expect(grammar.wrapColumn('name')).toBe('name')
    expect(grammar.wrapTable('users')).toBe('users')
    expect(grammar.quoteValue(123)).toBe('123')
    expect(grammar.compileLateralEagerLoad('t', 'id', [1], query as any)).toEqual({
      sql: '',
      bindings: [],
    })
    expect(grammar.compileJsonContains('payload', { ok: true })).toBe('payload')
    expect(grammar.compileUpdateJson(query as any, 'payload', { ok: true })).toBe('payload')
  })
})

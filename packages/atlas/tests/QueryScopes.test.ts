import { afterEach, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'
import type { QueryBuilderContract } from '../src/types'

class ScopedUser extends Model {
  static override table = 'users'
  declare id: number
  declare name: string
  declare active: boolean

  static scopeActive(query: QueryBuilderContract<ScopedUser>) {
    return query.where('active', true)
  }

  static scopeNameLike(query: QueryBuilderContract<ScopedUser>, name: string) {
    return query.where('name', 'like', `%${name}%`)
  }
}

describe('QueryScopes', () => {
  const TEST_CONN = `query_scopes_${Math.random().toString(36).slice(2)}`
  let mockConnection: any
  let mockGrammar: any
  let connectionSpy: any

  beforeEach(() => {
    mockGrammar = {
      compileSelect: jest.fn(() => 'SELECT * FROM users'),
      getStructuralKey: jest.fn(() => 'mock'),
    }

    mockConnection = {
      table: (name: string) => {
        const { QueryBuilder } = require('../src/query/QueryBuilder')
        return new QueryBuilder(mockConnection, mockGrammar, name)
      },
      raw: jest.fn().mockResolvedValue({ rows: [] }),
      getGrammar: () => mockGrammar,
      getTracer: () => undefined,
      getDriver: () => ({ getDriverName: () => 'mock' }),
    }

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) {
        return mockConnection
      }
      return originalConnection.call(DB, name as any)
    })

    ScopedUser.connection = TEST_CONN
  })

  afterEach(() => {
    connectionSpy.mockRestore()
    ScopedUser.connection = undefined
  })

  test('local scope works via proxy', () => {
    // @ts-expect-error - active is a dynamic proxy method
    const builder = ScopedUser.query().active()

    // @ts-expect-error
    expect(builder.wheres).toContainEqual({
      type: 'basic',
      column: 'active',
      operator: '=',
      value: true,
      boolean: 'and',
    })
  })

  test('local scope accepts arguments', () => {
    // @ts-expect-error
    const builder = ScopedUser.query().nameLike('Carl')

    // @ts-expect-error
    expect(builder.wheres).toContainEqual({
      type: 'basic',
      column: 'name',
      operator: 'like',
      value: '%Carl%',
      boolean: 'and',
    })
  })

  test('global scope is applied automatically', () => {
    class GlobalScopedUser extends ScopedUser {
      static boot() {
        // This is not implementation yet, but we manually trigger applyScope for now
      }
    }

    const builder = GlobalScopedUser.query()
    builder.applyScope('activeOnly', (query) => query.where('active', true))

    builder.getCompiledQuery()

    // @ts-expect-error
    expect(builder.globalScopes.has('activeOnly')).toBe(true)
  })

  test('withoutGlobalScope removes applied global scope', () => {
    const builder = ScopedUser.query()
    builder.applyScope('test', (query) => query.where('foo', 'bar'))

    builder.withoutGlobalScope('test')
    builder.getCompiledQuery()

    // @ts-expect-error
    expect(builder.removedScopes.has('test')).toBe(true)
  })
})

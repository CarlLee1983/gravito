import { afterEach, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test'
import { DB } from '../src/DB'
import { SoftDeletes } from '../src/orm/model/decorators'
import { Model } from '../src/orm/model/Model'

// Mock Model for Soft Deletes
@SoftDeletes()
class SoftUser extends Model {
  static override table = 'users'
  declare id: number
  declare name: string
  declare deleted_at: Date | null
}

describe('SoftDeletes', () => {
  let mockConnection: any
  let mockGrammar: any
  let connectionSpy: any
  let registrySpy: any

  beforeEach(() => {
    // Reset DB
    // @ts-expect-error
    DB.initialized = false

    // Reset mocks
    mockGrammar = {
      compileSelect: jest.fn(() => 'SELECT * FROM users WHERE deleted_at IS NULL'),
      compileUpdate: jest.fn(() => 'UPDATE users SET deleted_at = ? WHERE id = ?'),
      compileDelete: jest.fn(() => 'DELETE FROM users WHERE id = ?'),
    }

    mockConnection = {
      table: (name: string) => {
        const { QueryBuilder } = require('../src/query/QueryBuilder')
        return new QueryBuilder(mockConnection, mockGrammar, name)
      },
      raw: jest.fn().mockResolvedValue({ rows: [] }),
      getGrammar: () => mockGrammar,
      getDriver: () => ({
        getGrammar: () => mockGrammar,
        execute: jest.fn().mockResolvedValue({ affectedRows: 1, rows: [] }),
        getDriverName: () => 'mock',
      }),
    }

    // Mock DB.connection
    connectionSpy = spyOn(DB, 'connection').mockReturnValue(mockConnection)
    // @ts-expect-error
    DB.initialized = true

    // Mock SchemaRegistry to avoid real sniff
    const { SchemaRegistry } = require('../src/orm/schema/SchemaRegistry')
    registrySpy = spyOn(SchemaRegistry.prototype, 'get').mockResolvedValue({
      table: 'users',
      primaryKey: 'id',
      columns: new Map(
        Object.entries({
          id: { name: 'id', type: 'integer', isPrimary: true, nullable: false },
          name: { name: 'name', type: 'string', nullable: false },
          deleted_at: { name: 'deleted_at', type: 'datetime', nullable: true },
        })
      ),
    })
  })

  afterEach(async () => {
    connectionSpy.mockRestore()
    registrySpy.mockRestore()
    await DB._reset()
  })

  test('it appends deleted_at IS NULL by default', async () => {
    const builder = SoftUser.query()

    // We need to trigger a compilation to see the scopes applied
    // In our implementation, getCompiledQuery calls applyGlobalScopes
    builder.getCompiledQuery()

    // Verify that the softDeletes scope was registered
    // @ts-expect-error
    expect(builder.globalScopes.has('softDeletes')).toBe(true)
  })

  test('withTrashed removes the soft delete scope', async () => {
    const builder = SoftUser.query().withTrashed()
    builder.getCompiledQuery()

    // @ts-expect-error
    expect(builder.removedScopes.has('softDeletes')).toBe(true)
  })

  test('onlyTrashed filters for deleted records', async () => {
    const builder = SoftUser.query().onlyTrashed()
    builder.getCompiledQuery()

    // @ts-expect-error
    expect(builder.removedScopes.has('softDeletes')).toBe(true)
    // Check if whereNotNull('deleted_at') was called (via wheres array)
    // @ts-expect-error
    expect(builder.wheres).toContainEqual({
      type: 'null',
      column: 'deleted_at',
      boolean: 'and',
      not: true,
    })
  })

  test('model delete performs soft delete if decorator is present', async () => {
    const user = SoftUser.hydrate<SoftUser>({ id: 1, name: 'Carl' })
    const saveSpy = spyOn(Model.prototype, 'save').mockResolvedValue(user)

    await user.delete()

    expect(saveSpy).toHaveBeenCalled()
    expect(user.deleted_at).toBeInstanceOf(Date)

    saveSpy.mockRestore()
  })

  test('restore clears deleted_at', async () => {
    const user = SoftUser.hydrate<SoftUser>({ id: 1, name: 'Carl', deleted_at: new Date() })
    const saveSpy = spyOn(Model.prototype, 'save').mockResolvedValue(user)

    await user.restore()

    expect(user.deleted_at).toBeNull()
    expect(saveSpy).toHaveBeenCalled()

    saveSpy.mockRestore()
  })

  test('forceDelete performs physical delete', async () => {
    const user = SoftUser.hydrate<SoftUser>({ id: 1, name: 'Carl' })

    // Mock forceDelete on the builder
    const { QueryBuilder } = require('../src/query/QueryBuilder')
    const spy = spyOn(QueryBuilder.prototype, 'forceDelete').mockResolvedValue(1)

    await user.forceDelete()

    expect(spy).toHaveBeenCalled()
  })
})

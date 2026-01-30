import { afterEach, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test'
import { DB } from '../src/DB'
import { column } from '../src/orm/model/decorators'
import { Model } from '../src/orm/model/Model'

class User extends Model {
  static override table = 'users'
  declare id: number
  declare name: string
}

class UserObserver {
  async creating(_user: User) {}
  async created(_user: User) {}
  async updating(_user: User) {}
  async updated(_user: User) {}
  async saving(_user: User) {}
  async saved(_user: User) {}
  async deleting(_user: User) {}
  async deleted(_user: User) {}
}

describe('Model Observers', () => {
  const TEST_CONN = `observer_test_${Math.random().toString(36).slice(2)}`
  let mockConnection: any
  let mockGrammar: any
  let connectionSpy: any
  let registrySpy: any

  beforeEach(() => {
    // Reset DB
    // @ts-expect-error
    DB.initialized = false

    mockGrammar = {
      compileSelect: jest.fn(() => 'SELECT * FROM users'),
      compileUpdate: jest.fn(() => 'UPDATE users SET name = ? WHERE id = ?'),
      compileInsert: jest.fn(() => 'INSERT INTO users (name) VALUES (?)'),
      compileDelete: jest.fn(() => 'DELETE FROM users WHERE id = ?'),
      getStructuralKey: jest.fn(() => 'mock'),
      wrapTable: (t: any) => t,
      wrapColumn: (c: any) => c,
      getPlaceholder: () => '?',
    }

    mockConnection = {
      table: (name: string) => {
        const { QueryBuilder } = require('../src/query/QueryBuilder')
        return new QueryBuilder(mockConnection, mockGrammar, name)
      },
      raw: jest.fn().mockResolvedValue({ rows: [{ id: 1, name: 'Carl' }], rowCount: 1 }),
      getGrammar: () => mockGrammar,
      getTracer: () => undefined,
      getDriver: () => ({
        getGrammar: () => mockGrammar,
        execute: jest.fn().mockResolvedValue({ affectedRows: 1, rows: [{ id: 1 }] }),
        getDriverName: () => 'mock',
      }),
    }

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) return mockConnection
      return originalConnection.call(DB, name as any)
    })
    // @ts-expect-error
    DB.initialized = true

    User.connection = TEST_CONN

    // Mock SchemaRegistry to avoid real sniff
    const { SchemaRegistry } = require('../src/orm/schema/SchemaRegistry')
    registrySpy = spyOn(SchemaRegistry.prototype, 'get').mockResolvedValue({
      table: 'users',
      primaryKey: 'id',
      columns: new Map(
        Object.entries({
          id: { name: 'id', type: 'integer', isPrimary: true, nullable: false },
          name: { name: 'name', type: 'string', nullable: false },
        })
      ),
    })
  })

  afterEach(() => {
    connectionSpy.mockRestore()
    registrySpy.mockRestore()
    User.connection = undefined
    // biome-ignore lint/suspicious/noExplicitAny: Resetting observers
    ;(User as any).observers = []
  })

  test('it registers observer', () => {
    const observer = new UserObserver()
    User.observe(observer)

    // @ts-expect-error
    expect(User.observers).toHaveLength(1)
    // @ts-expect-error
    expect(User.observers[0]).toBe(observer)
  })

  test('it triggers observer events', async () => {
    const observer = new UserObserver()
    const createdSpy = spyOn(observer, 'created')
    const savedSpy = spyOn(observer, 'saved')

    User.observe(observer)

    const user = User.make<User>({ name: 'Carl' })
    await user.save()

    expect(createdSpy).toHaveBeenCalled()
    expect(createdSpy).toHaveBeenCalledWith(user) // Should receive model instance
    expect(savedSpy).toHaveBeenCalled()
  })

  test('it triggers updating on observer', async () => {
    const observer = new UserObserver()
    const updatingSpy = spyOn(observer, 'updating')

    User.observe(observer)

    const user = User.hydrate<User>({ id: 1, name: 'Carl' })
    user.name = 'Updated'
    await user.save()

    expect(updatingSpy).toHaveBeenCalled()
    expect(updatingSpy).toHaveBeenCalledWith(user)
  })
})

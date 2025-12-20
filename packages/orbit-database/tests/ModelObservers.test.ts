import { beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'

describe('Model Observers', () => {
  class User extends Model {
    static override table = 'users'
    declare id: number
    declare name: string
  }

  class UserObserver {
    created(_user: User) {}
    updating(_user: User) {}
    saved(_user: User) {}
  }

  let mockConnection: any

  beforeEach(() => {
    // Clear observers
    ;(User as any).observers = []

    mockConnection = {
      table: () => mockConnection,
      where: () => mockConnection,
      insert: () => Promise.resolve([1]),
      update: () => Promise.resolve(1),
      getGrammar: () => ({
        compileInsert: () => ({ sql: '', bindings: [] }),
        compileUpdate: () => ({ sql: '', bindings: [] }),
      }),
      getDriver: () => ({
        getGrammar: () => ({}),
      }),
      raw: () => Promise.resolve({ rows: [] }),
    }
    spyOn(DB, 'connection').mockReturnValue(mockConnection)

    // Mock SchemaRegistry to avoid sniffing
    const { SchemaRegistry } = require('../src/orm/schema/SchemaRegistry')
    spyOn(SchemaRegistry.prototype, 'get').mockResolvedValue({
      columns: new Map([
        ['id', { type: 'integer' } as any],
        ['name', { type: 'string' } as any],
      ]),
    } as any)
  })

  test('it registers observer', () => {
    const observer = new UserObserver()
    User.observe(observer)

    expect((User as any).observers).toHaveLength(1)
    expect((User as any).observers[0]).toBe(observer)
  })

  test('it triggers observer events', async () => {
    const observer = new UserObserver()
    const createdSpy = spyOn(observer, 'created')
    const savedSpy = spyOn(observer, 'saved')

    User.observe(observer)

    const user = User.create<User>({ name: 'Carl' })
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

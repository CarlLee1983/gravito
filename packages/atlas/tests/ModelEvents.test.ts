import { afterEach, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'

class EventUser extends Model {
  static override table = 'users'
  declare id: number
  declare name: string

  events: string[] = []

  async onSaving() {
    this.events.push('saving')
  }
  async onSaved() {
    this.events.push('saved')
  }
  async onCreating() {
    this.events.push('creating')
  }
  async onCreated() {
    this.events.push('created')
  }
  async onUpdating() {
    this.events.push('updating')
  }
  async onUpdated() {
    this.events.push('updated')
  }
  async onDeleting() {
    this.events.push('deleting')
  }
  async onDeleted() {
    this.events.push('deleted')
  }
  async onRetrieved() {
    this.events.push('retrieved')
  }
}

describe('ModelEvents', () => {
  const TEST_CONN = `model_events_${Math.random().toString(36).slice(2)}`
  let mockGrammar: any
  let registrySpy: any

  beforeEach(() => {
    mockGrammar = {
      compileSelect: jest.fn(() => 'SELECT * FROM users'),
      compileUpdate: jest.fn(() => 'UPDATE users SET name = ? WHERE id = ?'),
      compileInsert: jest.fn(() => 'INSERT INTO users (name) VALUES (?)'),
      compileDelete: jest.fn(() => 'DELETE FROM users WHERE id = ?'),
      compileAggregate: jest.fn(() => 'SELECT MAX(id) as aggregate FROM users'),
      getStructuralKey: jest.fn(() => 'mock'),
      wrapTable: jest.fn((t) => `"${t}"`),
      wrapColumn: jest.fn((c) => `"${c}"`),
      getPlaceholder: jest.fn(() => '?'),
    }

    DB.addConnection(TEST_CONN, {
      driver: 'sqlite',
      database: ':memory:',
    } as any)

    const conn = DB.connection(TEST_CONN)
    // @ts-expect-error - inject mock driver
    conn.driver = {
      getDriverName: () => 'mock',
      connect: async () => {},
      disconnect: async () => {},
      isConnected: () => true,
      query: async () => ({ rows: [{ id: 1, name: 'Carl' }], rowCount: 1 }),
      execute: async () => ({ affectedRows: 1, insertId: 1 }),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      inTransaction: () => false,
    }
    // @ts-expect-error - inject mock grammar
    conn.grammar = mockGrammar

    EventUser.connection = TEST_CONN

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

  afterEach(async () => {
    registrySpy.mockRestore()
    await DB.disconnect(TEST_CONN)
    DB.purge(TEST_CONN)
  })

  test('it triggers creating and saving events on insert', async () => {
    const user = EventUser.make<EventUser>({ name: 'Carl' })
    await user.save()

    expect(user.events).toContain('saving')
    expect(user.events).toContain('creating')
    expect(user.events).toContain('created')
    expect(user.events).toContain('saved')
  })

  test('it triggers updating and saving events on update', async () => {
    const user = EventUser.hydrate<EventUser>({ id: 1, name: 'Carl' })
    user.name = 'New Name'
    await user.save()

    expect(user.events).toContain('saving')
    expect(user.events).toContain('updating')
    expect(user.events).toContain('updated')
    expect(user.events).toContain('saved')
  })

  test('it triggers deleting and deleted events', async () => {
    const user = EventUser.hydrate<EventUser>({ id: 1, name: 'Carl' })
    await user.delete()

    expect(user.events).toContain('deleting')
    expect(user.events).toContain('deleted')
  })

  test('it triggers retrieved event on hydrate', async () => {
    const user = EventUser.hydrate<EventUser>({ id: 1, name: 'Carl' })

    // retrieved event is async, wait a bit
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(user.events).toContain('retrieved')
  })
})

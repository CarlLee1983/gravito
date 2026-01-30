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
  const TEST_CONN = 'model_events_test'
  let mockConnection: any
  let mockGrammar: any
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
      compileAggregate: jest.fn(() => 'SELECT MAX(id) as aggregate FROM users'),
      getStructuralKey: jest.fn(() => 'mock'),
      wrapTable: jest.fn((t) => `"${t}"`),
      wrapColumn: jest.fn((c) => `"${c}"`),
      getPlaceholder: jest.fn(() => '?'),
    }

    mockConnection = {
      getName: () => TEST_CONN,
      table: (name: string) => {
        const { QueryBuilder } = require('../src/query/QueryBuilder')
        return new QueryBuilder(mockConnection, mockGrammar, name)
      },
      raw: jest.fn().mockResolvedValue({ rows: [{ id: 1, name: 'Carl' }] }),
      getGrammar: () => mockGrammar,
      getTracer: () => undefined,
      getDriver: () => ({
        getGrammar: () => mockGrammar,
        execute: jest.fn().mockResolvedValue({ affectedRows: 1, rows: [{ id: 1 }] }),
        getDriverName: () => 'mock',
      }),
    }

    const originalManager = (DB as any).manager
    const mockManager = {
      connection: (name?: string) => {
        if (name === TEST_CONN || !name) return mockConnection
        return originalManager.connection(name)
      },
      hasConnection: (name: string) => name === TEST_CONN,
      getConfig: (name: string) => (name === TEST_CONN ? { driver: 'mock' } : undefined),
    }
    ;(DB as any).manager = mockManager
    ;(DB as any).initialized = true

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
    // Restore original manager
    // @ts-expect-error - reset DB state
    DB.manager = new (require('../src/connection/ConnectionManager').ConnectionManager)()
    // @ts-expect-error
    DB.initialized = false
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

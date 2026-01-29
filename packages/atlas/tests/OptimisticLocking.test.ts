import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DB } from '../src/DB'
import { column, version } from '../src/orm/model/decorators'
import { StaleModelError } from '../src/orm/model/errors'
import { Model } from '../src/orm/model/Model'
import { SchemaRegistry } from '../src/orm/schema/SchemaRegistry'
import { Schema } from '../src/schema/Schema'

const CONNECTION_NAME = `opt_lock_${Math.random().toString(36).slice(2)}`

class VersionedUser extends Model {
  static connection = CONNECTION_NAME
  static table = 'versioned_users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @version()
  declare version: number
}

describe('Optimistic Locking', () => {
  beforeAll(() => {
    // Force JIT mode for tests to avoid "Table not found in schema lock" errors in CI
    // We do this once to avoid disrupting other tests
    SchemaRegistry.init({ mode: 'jit' })

    if (!DB.initialized) {
      DB.configure({ connections: {} })
    }
  })

  beforeEach(async () => {
    DB.addConnection(CONNECTION_NAME, {
      driver: 'sqlite',
      database: ':memory:',
      useNativeDriver: false, // Disable due to Bun.sql limitation
    })

    await Schema.connection(CONNECTION_NAME).create('versioned_users', (table) => {
      table.id()
      table.string('name')
      table.integer('version').default(1)
      table.timestamps()
    })
  })

  afterEach(async () => {
    await DB.disconnect(CONNECTION_NAME)
    Schema.reset() // Only resets connectionName and grammar, safe-ish
  })

  it('should auto-increment version on update', async () => {
    const user = await VersionedUser.create({ name: 'Carl' })

    expect(user.version).toBe(1) // Default value from DB default or 1 if set?
    // Wait, if default is 1 in DB, and we didn't set it, it comes back as 1 after save if we refresh or return logic is used.
    // In insert(), we don't reload unless needed.
    // But default is handled by DB.
    // If we want to check, we should fetch it.
    const fetched = (await VersionedUser.find(user.id))!
    expect(fetched.version).toBe(1)

    fetched.name = 'Carl Updated'
    await fetched.save()
    expect(fetched.version).toBe(2)

    const fetched2 = (await VersionedUser.find(user.id))!
    expect(fetched2.version).toBe(2)
  })

  it('should throw StaleModelError on concurrent update', async () => {
    const user = await VersionedUser.create({ name: 'Concurrent' })

    // Simulate two users fetching the same record
    const user1 = (await VersionedUser.find(user.id))!
    const user2 = (await VersionedUser.find(user.id))!

    // User 1 updates
    user1.name = 'User 1 Update'
    await user1.save()
    expect(user1.version).toBe(2)

    // User 2 tries to update (has old version 1)
    user2.name = 'User 2 Update'
    try {
      await user2.save()
      throw new Error('Should have thrown StaleModelError')
    } catch (error) {
      expect(error).toBeInstanceOf(StaleModelError)
    }
  })

  it('should allow force update if refreshed', async () => {
    const user = await VersionedUser.create({ name: 'Refresh' })

    const user1 = (await VersionedUser.find(user.id))!
    const user2 = (await VersionedUser.find(user.id))!

    user1.name = 'User 1'
    await user1.save()

    // User 2 refreshes to get latest version
    await user2.refresh()
    expect(user2.version).toBe(2)

    user2.name = 'User 2'
    await user2.save() // Should succeed now
    expect(user2.version).toBe(3)
  })
})

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DB } from '../src/DB'
import { column, version } from '../src/orm/model/decorators'
import { StaleModelError } from '../src/orm/model/errors'
import { Model } from '../src/orm/model/Model'
import { SchemaRegistry } from '../src/orm/schema/SchemaRegistry'
import { Schema } from '../src/schema/Schema'

describe('Optimistic Locking', () => {
  const TEST_CONN = `opt_lock_${Math.random().toString(36).slice(2)}`

  class VersionedUser extends Model {
    static override connection = TEST_CONN
    static override table = 'versioned_users'
    static override strictMode = false

    @column({ isPrimary: true })
    declare id: number

    @column()
    declare name: string

    @version()
    declare version: number
  }

  beforeAll(() => {
    // Force JIT mode for tests
    SchemaRegistry.init({ mode: 'jit' })
  })

  beforeEach(async () => {
    SchemaRegistry.getInstance().invalidateAll()
    DB.addConnection(TEST_CONN, {
      driver: 'sqlite',
      database: ':memory:',
      useNativeDriver: false,
    })

    await Schema.connection(TEST_CONN).create('versioned_users', (table) => {
      table.id()
      table.string('name')
      table.integer('version').default(1)
      table.timestamps()
    })
  })

  afterEach(async () => {
    await DB.disconnect(TEST_CONN)
    DB.purge(TEST_CONN)
    Schema.reset()
  })

  it('should auto-increment version on update', async () => {
    const user = await VersionedUser.create({ name: 'Carl' })

    expect(user.version).toBe(1)
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

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { column, DB, Model, Schema } from '../../src/index'

const DB_FILE = `test_trx_${Math.random().toString(36).slice(2, 7)}.sqlite`
const CONNECTION_NAME = `trx_test_${Math.random().toString(36).slice(2, 7)}`

class User extends Model {
  static connection = CONNECTION_NAME
  static table = 'users'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
}

describe('Transaction Test', () => {
  const ensureSqlite = () => {
    if (!DB.hasConnection(CONNECTION_NAME)) {
      DB.addConnection(CONNECTION_NAME, {
        driver: 'sqlite',
        database: DB_FILE,
      })
    }
  }

  beforeAll(async () => {
    ensureSqlite()
    await Schema.connection(CONNECTION_NAME).dropIfExists('users')
    await Schema.connection(CONNECTION_NAME).create('users', (t) => {
      t.id()
      t.string('name')
      t.timestamps()
    })
  })

  beforeEach(async () => {
    ensureSqlite()
    await DB.connection(CONNECTION_NAME).table('users').truncate()
  })

  afterAll(async () => {
    await DB.disconnect(CONNECTION_NAME)
    try {
      unlinkSync(DB_FILE)
    } catch (e) {
      // Ignore
    }
  })

  test('nested transactions with savepoints', async () => {
    await DB.connection(CONNECTION_NAME).transaction(async (trx) => {
      await User.create({ name: 'User 1' })

      try {
        await trx.transaction(async () => {
          await User.create({ name: 'User 2' })
          throw new Error('Rollback nested')
        })
      } catch (e) {
        // Expected
      }

      // User 1 should still exist
      const count = await User.count()
      expect(count).toBe(1)
      const user = await User.first()
      expect(user?.name).toBe('User 1')
    })
  })
})

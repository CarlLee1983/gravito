import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { column, DB, Model, Schema } from '../../src/index'

class User extends Model {
  static table = 'users'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
}

describe('Transaction Test', () => {
  const ensureSqlite = () => {
    if (!DB.getConnectionConfig('sqlite')) {
      DB.configure({
        default: 'sqlite',
        connections: {
          sqlite: { driver: 'sqlite', database: ':memory:' },
        },
      })
    }
    if (DB.getDefaultConnection() !== 'sqlite') {
      DB.setDefaultConnection('sqlite')
    }
    Schema.connection('sqlite')
  }

  beforeAll(async () => {
    ensureSqlite()
    await Schema.create('users', (t) => {
      t.id()
      t.string('name')
      t.timestamps()
    })
  })

  beforeEach(() => {
    ensureSqlite()
  })

  afterAll(async () => {
    await DB.disconnectAll()
  })

  test('nested transactions with savepoints', async () => {
    await DB.transaction(async (trx) => {
      await User.create({ name: 'User 1' })

      try {
        await trx.transaction(async (nested) => {
          await User.create({ name: 'User 2' })
          throw new Error('Rollback nested')
        })
      } catch (e) {
        // Expected
      }

      // User 1 should still exist
      const count = await User.count()
      // Note: SQLite nested transactions might be tricky with some drivers,
      // but assuming our implementation sends SAVEPOINT correctly
      expect(count).toBe(1)
      const user = await User.first()
      expect(user?.name).toBe('User 1')
    })
  })
})

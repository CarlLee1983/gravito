import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { column, DB, Model, Schema } from '../../src/index'

class User extends Model {
  static override table = 'users'
  static override connection = 'transaction_test'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
}

describe('Transaction Test', () => {
  const ensureSqlite = () => {
    if (!DB.hasConnection('transaction_test')) {
      DB.addConnection('transaction_test', {
        driver: 'sqlite',
        database: ':memory:',
      })
    }
  }

  beforeAll(async () => {
    ensureSqlite()
    await Schema.connection('transaction_test').create('users', (t) => {
      t.id()
      t.string('name')
      t.timestamps()
    })
  })

  afterAll(async () => {
    await DB.disconnect('transaction_test')
  })

  test('nested transactions with savepoints', async () => {
    await DB.transaction(async (trx) => {
      await User.create({ name: 'User 1' })

      try {
        await trx.transaction(async (_nested) => {
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
    }, 'transaction_test')
  })
})

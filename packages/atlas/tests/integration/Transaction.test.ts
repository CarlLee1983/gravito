import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { column, DB, Model, Schema } from '../../src/index'

const DB_FILE = `test_trx_${Math.random().toString(36).slice(2, 7)}.sqlite`
const CONNECTION_NAME = `trx_test_${Math.random().toString(36).slice(2, 7)}`

class TransactionUser extends Model {
  static override table = 'users'
  static override connection = CONNECTION_NAME
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
    await Schema.connection(CONNECTION_NAME).create('users', (t) => {
      t.id()
      t.string('name')
      t.timestamps()
    })
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
    await DB.transaction(async (trx) => {
      await TransactionUser.create({ name: 'User 1' })

      try {
        await trx.transaction(async (_nested) => {
          await TransactionUser.create({ name: 'User 2' })
          throw new Error('Rollback nested')
        })
      } catch (e) {
        // Expected
      }

      // User 1 should still exist
      const count = await TransactionUser.count()
      expect(count).toBe(1)
      const user = await TransactionUser.first()
      expect(user?.name).toBe('User 1')
    }, CONNECTION_NAME)
  })
})

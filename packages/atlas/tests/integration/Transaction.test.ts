import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { column, DB, Model, Schema } from '../../src/index'

const DB_FILE = `test_trx_${process.pid}_${Math.random().toString(36).slice(2, 7)}.sqlite`
const CONNECTION_NAME = `trx_test_${process.pid}_${Math.random().toString(36).slice(2, 7)}`
const TABLE_NAME = `users_${process.pid}`

// biome-ignore lint/correctness/noUnusedVariables: Used in tests via Model.query()
class User extends Model {
  static connection = CONNECTION_NAME
  static table = TABLE_NAME
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
    DB.debug(true)
    process.env.DEBUG_ATLAS = 'true'
    ensureSqlite()
    await Schema.connection(CONNECTION_NAME).dropIfExists(TABLE_NAME)
    await Schema.connection(CONNECTION_NAME).create(TABLE_NAME, (t) => {
      t.id()
      t.string('name')
      t.timestamps()
    })
  })

  beforeEach(async () => {
    ensureSqlite()
    await DB.connection(CONNECTION_NAME).table(TABLE_NAME).truncate()
  })

  afterAll(async () => {
    await DB.disconnect(CONNECTION_NAME)
    try {
      if (typeof Bun !== 'undefined') {
        await Bun.sleep(50) // Yield to event loop
      }
      unlinkSync(DB_FILE)
    } catch (_e) {
      // Ignore cleanup errors
    }
  })

  test('nested transactions with savepoints', async () => {
    console.log(
      `[Test] Starting nested transaction test on ${CONNECTION_NAME} with table ${TABLE_NAME}`
    )
    const conn = DB.connection(CONNECTION_NAME)

    await conn.transaction(async (trx) => {
      console.log('[Test] Outer transaction started')

      await trx.execute(
        `INSERT INTO ${TABLE_NAME} (name, created_at, updated_at) VALUES (?, ?, ?)`,
        ['User 1', new Date().toISOString(), new Date().toISOString()]
      )
      console.log('[Test] User 1 inserted via raw SQL')

      try {
        await trx.transaction(async (innerTrx) => {
          console.log('[Test] Inner transaction started')
          await innerTrx.execute(
            `INSERT INTO ${TABLE_NAME} (name, created_at, updated_at) VALUES (?, ?, ?)`,
            ['User 2', new Date().toISOString(), new Date().toISOString()]
          )
          console.log('[Test] User 2 inserted via raw SQL')
          throw new Error('Rollback nested')
        })
      } catch (e: any) {
        console.log(`[Test] Inner transaction failed as expected: ${e.message}`)
      }

      console.log('[Test] Checking User count after inner rollback')
      const result = await trx.raw(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
      const count = (result.rows[0] as any).count
      console.log(`[Test] User count: ${count}`)

      expect(count).toBe(1)

      const userResult = await trx.raw(`SELECT * FROM ${TABLE_NAME} LIMIT 1`)
      expect((userResult.rows[0] as any).name).toBe('User 1')
    })
    console.log('[Test] Outer transaction committed')
  })
})

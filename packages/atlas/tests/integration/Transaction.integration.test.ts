import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { ConnectionManager } from '../../src/connection/ConnectionManager'

const DB_FILE = `test_trx_${process.pid}_${Math.random().toString(36).slice(2, 7)}.sqlite`
const CONNECTION_NAME = 'default'
const TABLE_NAME = `users_${process.pid}`

// Create a standalone manager to avoid singleton side effects
const manager = new ConnectionManager({
  [CONNECTION_NAME]: {
    driver: 'sqlite',
    database: DB_FILE,
    useNativeDriver: false,
  },
})

describe('Transaction Test', () => {
  beforeAll(async () => {
    const conn = manager.connection(CONNECTION_NAME)
    // Use raw SQL for setup to bypass Schema facade and its dependencies
    await conn.execute(`DROP TABLE IF EXISTS ${TABLE_NAME}`)
    await conn.execute(`CREATE TABLE ${TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      created_at TEXT,
      updated_at TEXT
    )`)
  })

  beforeEach(async () => {
    await manager.connection(CONNECTION_NAME).execute(`DELETE FROM ${TABLE_NAME}`)
  })

  afterAll(async () => {
    try {
      await manager.shutdown()
      if (typeof Bun !== 'undefined') {
        await Bun.sleep(50)
      }
      unlinkSync(DB_FILE)
    } catch (_e) {
      // Ignore cleanup errors
    }
  })

  test('nested transactions with savepoints', async () => {
    const conn = manager.connection(CONNECTION_NAME)

    await conn.transaction(async (trx) => {
      await trx.execute(
        `INSERT INTO ${TABLE_NAME} (name, created_at, updated_at) VALUES (?, ?, ?)`,
        ['User 1', new Date().toISOString(), new Date().toISOString()]
      )

      try {
        await trx.transaction(async (innerTrx) => {
          await innerTrx.execute(
            `INSERT INTO ${TABLE_NAME} (name, created_at, updated_at) VALUES (?, ?, ?)`,
            ['User 2', new Date().toISOString(), new Date().toISOString()]
          )
          throw new Error('Rollback nested')
        })
      } catch (_e: any) {
        // Expected rollback
      }

      const result = await trx.raw(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
      const count = (result.rows[0] as any).count
      expect(count).toBe(1)

      const userResult = await trx.raw(`SELECT * FROM ${TABLE_NAME} LIMIT 1`)
      expect((userResult.rows[0] as any).name).toBe('User 1')
    })
  })
})

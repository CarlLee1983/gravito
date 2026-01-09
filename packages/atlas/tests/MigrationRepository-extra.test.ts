import { describe, expect, it } from 'bun:test'
import { DB } from '../src/DB'
import { MigrationRepository } from '../src/migration/MigrationRepository'
import { Schema } from '../src/schema/Schema'
import type { ConnectionContract } from '../src/types'

describe('MigrationRepository', () => {
  it('tracks migrations using schema and db helpers', async () => {
    const originalConnection = DB.connection
    const originalSchemaConnection = Schema.connection

    const calls: string[] = []
    const records = [
      { migration: '20240101_create_users', batch: 1 },
      { migration: '20240102_create_posts', batch: 1 },
    ]
    let exists = false

    const table = {
      orderBy: () => table,
      where: () => table,
      get: async () => records,
      max: async () => 2,
      insert: async () => {
        calls.push('insert')
      },
      delete: async () => {
        calls.push('delete')
      },
    }

    const connection: ConnectionContract = {
      getName: () => 'default',
      getDriver: () => ({}) as any,
      getConfig: () => ({ driver: 'postgres', database: 'test' }),
      table: () => table as any,
      raw: async () => ({ rows: [], rowCount: 0 }),
      transaction: async (cb) => cb(connection),
      disconnect: async () => {},
    }

    try {
      DB.connection = () => connection
      Schema.connection = () =>
        ({
          create: async () => {
            calls.push('create')
            exists = true
          },
          hasTable: async () => exists,
          dropIfExists: async () => {
            calls.push('drop')
          },
        }) as any

      const repo = new MigrationRepository()
      await repo.createRepository()
      await repo.deleteRepository()

      expect(await repo.repositoryExists()).toBe(true)
      expect(await repo.getRan()).toEqual(['20240101_create_users', '20240102_create_posts'])
      expect(await repo.getMigrations(1)).toEqual(records)
      expect(await repo.getLastBatchNumber()).toBe(2)
      expect(await repo.getNextBatchNumber()).toBe(3)

      await repo.log('20240103_add_index', 2)
      await repo.delete('20240103_add_index')

      const last = await repo.getLast()
      expect(last).toEqual(records)
      expect(calls).toContain('create')
      expect(calls).toContain('drop')
    } finally {
      DB.connection = originalConnection
      Schema.connection = originalSchemaConnection
    }
  })
})

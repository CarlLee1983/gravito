import { describe, expect, it, spyOn } from 'bun:test'
import { DB } from '../src/DB'
import { MigrationRepository } from '../src/migration/MigrationRepository'
import { Schema } from '../src/schema/Schema'
import type { ConnectionContract } from '../src/types'

describe('MigrationRepository', () => {
  it('tracks migrations using schema and db helpers', async () => {
    const TEST_CONN = `migration_repo_${Math.random().toString(36).slice(2)}`
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

    DB.addConnection(TEST_CONN, {
      driver: 'sqlite',
      database: ':memory:',
    } as any)

    const conn = DB.connection(TEST_CONN)
    // @ts-expect-error - inject mock driver
    conn.driver = {
      getDriverName: () => 'mock',
      connect: async () => {},
      disconnect: async () => {},
      isConnected: () => true,
      query: async () => ({ rows: records, rowCount: records.length }),
      execute: async () => ({ affectedRows: 1 }),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      inTransaction: () => false,
    }
    // @ts-expect-error - inject mock table implementation
    conn.table = () => table as any

    // For Schema, we can't easily inject into the singleton without affecting others,
    // but Schema.connection(name) creates a new instance.
    // However, MigrationRepository calls Schema.connection(this.connection).
    // We can mock the Schema.connection method LOCALLY for this test only if we are careful.

    const originalSchemaConnection = Schema.connection
    const schemaSpy = spyOn(Schema, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) {
        return {
          create: async () => {
            calls.push('create')
            exists = true
          },
          hasTable: async () => exists,
          dropIfExists: async () => {
            calls.push('drop')
          },
        } as any
      }
      return originalSchemaConnection.call(Schema, name as any)
    })

    try {
      const repo = new MigrationRepository(TEST_CONN)

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
      schemaSpy.mockRestore()
      await DB.disconnect(TEST_CONN)
      DB.purge(TEST_CONN)
    }
  })
})

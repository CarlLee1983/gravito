import { beforeEach, describe, expect, it } from 'bun:test'
import type { Database } from '@gravito/atlas'

export interface TestContext {
  db: Database
}

export async function setupTestDatabase(): Promise<Database> {
  // 使用 SQLite in-memory 進行測試
  const db = {
    query: (table: string) => ({
      where: (col: string, val: string) => ({
        first: async () => null,
        delete: async () => ({ rowCount: 0 }),
      }),
      insert: async () => ({ id: 1 }),
      limit: (n: number) => ({
        offset: (n: number) => [],
      }),
      orderBy: () => ({
        limit: (n: number) => ({
          offset: (n: number) => [],
        }),
      }),
      count: () => ({
        first: async () => ({ count: 0 }),
      }),
      first: async () => null,
    }),
    schema: {
      hasTable: async () => false,
      createTable: async () => {},
    },
  } as unknown as Database

  return db
}

export function cleanupTestDatabase(db: Database): void {
  // 清理測試資料庫
}

/**
 * @fileoverview DatabaseBackupService 測試
 */

import { afterAll, beforeAll, describe, expect, it, jest } from 'bun:test'
import { randomUUID } from 'node:crypto'
import * as os from 'node:os'
import * as path from 'node:path'
import { DB, Schema } from '../src'

// ============ Mock 設定 ============
// Use dependency injection instead of mock.module('@gravito/core') to prevent
// mock leakage into other test files during parallel execution.
// (Prior approach with mock.module caused LocalStore, nebula, and other packages
// to fail because @gravito/core was replaced with an incomplete stub.)

const mockArchiveCreate = jest.fn(async (_entries: Record<string, unknown>) => {
  return new TextEncoder().encode('mock-tar-gz-data')
})

const mockArchiveReadFile = jest.fn(async (_data: unknown, filePath: string) => {
  if (filePath === 'backup_manifest.json') {
    const manifest = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      driver: 'sqlite',
      tables: ['users', 'posts'],
      rowCounts: { users: 2, posts: 3 },
    }
    return new TextEncoder().encode(JSON.stringify(manifest))
  }
  if (filePath === 'data/users.jsonl') {
    const rows = [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ]
    return new TextEncoder().encode(rows.map((r) => JSON.stringify(r)).join('\n'))
  }
  if (filePath === 'data/posts.jsonl') {
    const rows = [
      { id: 1, title: 'Hello World', userId: 1 },
      { id: 2, title: 'Second Post', userId: 1 },
      { id: 3, title: 'Third Post', userId: 2 },
    ]
    return new TextEncoder().encode(rows.map((r) => JSON.stringify(r)).join('\n'))
  }
  return null
})

const mockWrittenFiles: Record<string, string> = {}
const mockRuntimeWriteFile = jest.fn(async (filePath: string, data: unknown) => {
  mockWrittenFiles[filePath] =
    data instanceof Uint8Array ? new TextDecoder().decode(data) : String(data)
})

const mockRuntimeReadFile = jest.fn(async (filePath: string): Promise<Uint8Array> => {
  if (filePath.includes('nonexistent')) {
    throw new Error(`ENOENT: no such file or directory, '${filePath}'`)
  }
  return new TextEncoder().encode('fake-archive-binary')
})

// Mock adapters passed via constructor (no module-level mocking needed)
const mockArchiveAdapter = {
  create: mockArchiveCreate,
  extract: jest.fn(async () => 0),
  list: jest.fn(async () => new Map()),
  readFile: mockArchiveReadFile,
}

const mockRuntimeAdapter = {
  writeFile: mockRuntimeWriteFile,
  readFile: mockRuntimeReadFile,
}

// ============ 測試主體 ============

describe('DatabaseBackupService', () => {
  let DatabaseBackupService: any
  let tmpDir: string

  beforeAll(async () => {
    // 使用真實的 DB 和 Schema，但用 SQLite memory
    DB.addConnection('backup_test', {
      driver: 'sqlite',
      database: ':memory:',
    })

    // 建立測試資料表
    await Schema.connection('backup_test').create('users', (table) => {
      table.id()
      table.string('name')
      table.string('email')
    })

    await Schema.connection('backup_test').create('posts', (table) => {
      table.id()
      table.string('title')
      table.integer('userId')
    })

    // 插入測試資料
    await DB.connection('backup_test')
      .table('users')
      .insert([
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Bob', email: 'bob@example.com' },
      ])

    await DB.connection('backup_test')
      .table('posts')
      .insert([
        { title: 'Hello World', userId: 1 },
        { title: 'Second Post', userId: 1 },
        { title: 'Third Post', userId: 2 },
      ])

    const module = await import('../src/backup/DatabaseBackupService')
    DatabaseBackupService = module.DatabaseBackupService
  })

  afterAll(async () => {
    await DB.disconnect('backup_test')
  })

  it('T1: backup - SQLite 正常備份', async () => {
    tmpDir = path.join(os.tmpdir(), `atlas-backup-test-${randomUUID()}`)
    const backupPath = path.join(tmpDir, 'backup.tar.gz')

    // Inject mock adapters via constructor (no module mocking needed)
    const service = new DatabaseBackupService('backup_test', mockArchiveAdapter, mockRuntimeAdapter)
    const result = await service.backup(backupPath)

    expect(result.outputPath).toBe(backupPath)
    expect(result.tables).toContain('users')
    expect(result.tables).toContain('posts')
    expect(mockArchiveCreate).toHaveBeenCalled()
  })

  it('T2: restore - 正常還原', async () => {
    const backupPath = path.join(tmpDir, 'backup.tar.gz')

    // 清空資料表以測試還原
    await DB.connection('backup_test').table('users').delete()
    await DB.connection('backup_test').table('posts').delete()

    const service = new DatabaseBackupService('backup_test', mockArchiveAdapter, mockRuntimeAdapter)
    await service.restore(backupPath)

    // 驗證資料已還原
    const users = await DB.connection('backup_test').table('users').get()
    expect(users).toHaveLength(2)

    const posts = await DB.connection('backup_test').table('posts').get()
    expect(posts).toHaveLength(3)
  })

  it('T3: exportSchemaAsMigration - 生成 migration 檔案', async () => {
    const outputDir = path.join(tmpDir, 'migrations')
    // T3 uses real FS for schema export (no archive/runtime mock needed)
    const service = new DatabaseBackupService('backup_test', mockArchiveAdapter, mockRuntimeAdapter)
    const filePath = await service.exportSchemaAsMigration('initial', outputDir)

    expect(filePath).toContain(outputDir)
    expect(filePath).toContain('initial.ts')
  })

  it('T4: 錯誤處理 - 無效備份檔案應拋出錯誤', async () => {
    const invalidPath = path.join(tmpDir, 'nonexistent.tar.gz')
    const service = new DatabaseBackupService('backup_test', mockArchiveAdapter, mockRuntimeAdapter)
    await expect(service.restore(invalidPath)).rejects.toThrow()
  })
})

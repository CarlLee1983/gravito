/**
 * @fileoverview DatabaseBackupService 測試
 *
 * 測試案例：
 * T1: backup - SQLite 正常備份（歸檔建立、manifest 驗證）
 * T2: restore - 正常還原（讀取歸檔、逐表插入）
 * T3: exportSchemaAsMigration - 生成 migration 檔案
 * T4: 錯誤處理 - 無效備份檔案應拋出錯誤
 */

import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test'
import { randomUUID } from 'node:crypto'
import * as os from 'node:os'
import * as path from 'node:path'

// ============ Mock 設定 ============

// 模擬 @gravito/core 的 getArchiveAdapter 與 getRuntimeAdapter
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

// readFile 拋出例外模擬不存在的檔案
const mockRuntimeReadFile = jest.fn(async (filePath: string): Promise<Uint8Array> => {
  if (filePath.includes('nonexistent')) {
    throw new Error(`ENOENT: no such file or directory, '${filePath}'`)
  }
  return new TextEncoder().encode('fake-archive-binary')
})

mock.module('@gravito/core', () => ({
  getArchiveAdapter: () => ({
    create: mockArchiveCreate,
    extract: jest.fn(async () => 0),
    list: jest.fn(async () => new Map()),
    readFile: mockArchiveReadFile,
  }),
  getRuntimeAdapter: () => ({
    writeFile: mockRuntimeWriteFile,
    readFile: mockRuntimeReadFile,
  }),
}))

// 模擬 node:fs/promises mkdir（DatabaseBackupService 直接使用 node:fs/promises）
mock.module('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
}))

// 模擬 DB 和 Schema
const mockInsert = jest.fn(async () => [])
const mockDelete = jest.fn(async () => 0)
const mockGet = jest.fn(async (table: string) => {
  if (table === 'users') {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]
  }
  if (table === 'posts') {
    return [
      { id: 1, title: 'Hello' },
      { id: 2, title: 'World' },
      { id: 3, title: 'Third' },
    ]
  }
  return []
})

const mockTable = jest.fn((tableName: string) => ({
  get: () => mockGet(tableName),
  insert: mockInsert,
  delete: mockDelete,
}))

const mockRaw = jest.fn(async () => ({
  rows: [{ table_name: 'users' }, { table_name: 'posts' }],
}))

const mockTransaction = jest.fn(async (fn: (trx: unknown) => Promise<void>) => {
  await fn({
    table: mockTable,
    raw: mockRaw,
  })
})

mock.module('../src/DB', () => ({
  DB: {
    connection: jest.fn(() => ({
      table: mockTable,
      raw: mockRaw,
      transaction: mockTransaction,
      config: { driver: 'sqlite' },
    })),
  },
}))

mock.module('../src/schema', () => ({
  Schema: {
    getTables: jest.fn(async () => ['users', 'posts']),
    hasTable: jest.fn(async () => true),
  },
}))

// ============ 測試主體 ============

describe('DatabaseBackupService', () => {
  let DatabaseBackupService: typeof import('../src/backup/DatabaseBackupService').DatabaseBackupService
  let tmpDir: string

  beforeEach(async () => {
    ;({ DatabaseBackupService } = await import('../src/backup/DatabaseBackupService'))
    tmpDir = path.join(os.tmpdir(), `atlas-backup-test-${randomUUID()}`)
    // 重置所有 mock
    jest.clearAllMocks()
    for (const k of Object.keys(mockWrittenFiles)) {
      delete mockWrittenFiles[k]
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('T1: backup() - SQLite 正常備份', () => {
    it('應備份所有表並建立歸檔', async () => {
      const service = new DatabaseBackupService()
      const outputPath = `${tmpDir}/backup.tar.gz`

      const result = await service.backup(outputPath)

      // 驗證基本結果欄位
      expect(result.outputPath).toBe(outputPath)
      expect(result.tableCount).toBe(2)
      expect(result.tables).toContain('users')
      expect(result.tables).toContain('posts')
      expect(result.rowCount).toBe(5) // 2 users + 3 posts
      expect(result.createdAt).toBeTruthy()

      // 驗證 archive.create 有被呼叫
      expect(mockArchiveCreate).toHaveBeenCalledTimes(1)

      // 驗證 entries 包含必要檔案
      const entries = mockArchiveCreate.mock.calls[0][0] as Record<string, string>
      const entryKeys = Object.keys(entries)
      expect(entryKeys).toContain('backup_manifest.json')
      expect(entryKeys).toContain('data/users.jsonl')
      expect(entryKeys).toContain('data/posts.jsonl')
      expect(entryKeys).toContain('schema.json')

      // 驗證 manifest 內容
      const manifest = JSON.parse(entries['backup_manifest.json'])
      expect(manifest.version).toBe('1.0.0')
      expect(manifest.tables).toEqual(['users', 'posts'])
      expect(manifest.driver).toBe('sqlite')
      expect(manifest.rowCounts.users).toBe(2)
      expect(manifest.rowCounts.posts).toBe(3)

      // 驗證 runtime.writeFile 有被呼叫
      expect(mockRuntimeWriteFile).toHaveBeenCalledWith(outputPath, expect.any(Uint8Array))
    })

    it('指定 tables 選項時只備份指定的表', async () => {
      const service = new DatabaseBackupService()
      const outputPath = `${tmpDir}/partial-backup.tar.gz`

      const result = await service.backup(outputPath, { tables: ['users'] })

      expect(result.tableCount).toBe(1)
      expect(result.tables).toContain('users')
      expect(result.tables).not.toContain('posts')
      expect(result.rowCount).toBe(2)

      const entries = mockArchiveCreate.mock.calls[0][0] as Record<string, string>
      const entryKeys = Object.keys(entries)
      expect(entryKeys).toContain('data/users.jsonl')
      expect(entryKeys).not.toContain('data/posts.jsonl')
    })
  })

  describe('T2: restore() - 正常還原', () => {
    it('應從備份歸檔讀取 manifest 並插入各表資料', async () => {
      const service = new DatabaseBackupService()
      const backupPath = `${tmpDir}/backup.tar.gz`

      await service.restore(backupPath)

      // 驗證 runtime.readFile 讀取備份檔案
      expect(mockRuntimeReadFile).toHaveBeenCalledWith(backupPath)

      // 驗證 archive.readFile 讀取了 manifest
      expect(mockArchiveReadFile).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        'backup_manifest.json'
      )

      // 驗證每個表的 JSONL 都被讀取
      expect(mockArchiveReadFile).toHaveBeenCalledWith(expect.any(Uint8Array), 'data/users.jsonl')
      expect(mockArchiveReadFile).toHaveBeenCalledWith(expect.any(Uint8Array), 'data/posts.jsonl')

      // 驗證資料被插入
      expect(mockInsert).toHaveBeenCalled()
    })

    it('備份檔案不存在時應拋出錯誤', async () => {
      const service = new DatabaseBackupService()
      const nonExistentPath = `${tmpDir}/nonexistent-backup.tar.gz`

      await expect(service.restore(nonExistentPath)).rejects.toThrow(/備份檔案不存在或無法讀取/)
    })
  })

  describe('T3: exportSchemaAsMigration() - 生成 migration 檔案', () => {
    it('應產生包含所有表定義的 TypeScript migration 檔案', async () => {
      const service = new DatabaseBackupService()
      const outputDir = `${tmpDir}/migrations`

      const filePath = await service.exportSchemaAsMigration('initial_schema', outputDir)

      // 驗證 writeFile 被呼叫且檔名包含 migration 名稱
      expect(mockRuntimeWriteFile).toHaveBeenCalledTimes(1)
      expect(filePath).toContain('initial_schema')
      expect(filePath).toContain(outputDir)
      expect(filePath).toEndWith('.ts')

      // 驗證 migration 內容
      const [, writtenContent] = mockRuntimeWriteFile.mock.calls[0]
      expect(writtenContent).toContain('export async function up')
      expect(writtenContent).toContain('export async function down')
      expect(writtenContent).toContain('users')
      expect(writtenContent).toContain('posts')
      expect(writtenContent).toContain('sqlite')
    })
  })

  describe('T4: 錯誤處理', () => {
    it('restore() 收到無效備份（缺少 manifest）應拋出錯誤', async () => {
      // 讓 archive.readFile 對 manifest 回傳 null
      mockArchiveReadFile.mockImplementationOnce(async () => null)

      const service = new DatabaseBackupService()

      await expect(service.restore(`${tmpDir}/invalid-backup.tar.gz`)).rejects.toThrow(
        /備份檔案格式無效/
      )
    })

    it('backup() 支援 includeSchema:false 選項（不包含 schema.json）', async () => {
      const service = new DatabaseBackupService()

      await service.backup(`${tmpDir}/no-schema.tar.gz`, { includeSchema: false })

      const entries = mockArchiveCreate.mock.calls[0][0] as Record<string, string>
      const entryKeys = Object.keys(entries)
      expect(entryKeys).not.toContain('schema.json')
      expect(entryKeys).toContain('backup_manifest.json')
    })
  })
})

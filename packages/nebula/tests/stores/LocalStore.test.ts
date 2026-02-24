import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as coreModule from '@gravito/core'
import { LocalStore } from '../../src/stores/LocalStore'

let tempDir = ''
let store: LocalStore

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'nebula-localstore-'))
  store = new LocalStore(tempDir, '/storage')
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

describe('LocalStore - Basic Operations', () => {
  it('should put and get file', async () => {
    await store.put('test.txt', 'hello world')

    const data = await store.get('test.txt')
    expect(data).toBeInstanceOf(Blob)
    expect(await data?.text()).toBe('hello world')
  })

  it('should return null for non-existent file', async () => {
    const data = await store.get('non-existent.txt')
    expect(data).toBeNull()
  })

  it('should delete file', async () => {
    await store.put('delete-me.txt', 'temp')

    expect(await store.exists('delete-me.txt')).toBe(true)
    expect(await store.delete('delete-me.txt')).toBe(true)
    expect(await store.exists('delete-me.txt')).toBe(false)
  })

  it('should return false when deleting non-existent file', async () => {
    expect(await store.delete('non-existent.txt')).toBe(false)
  })

  it('should check file existence', async () => {
    await store.put('exists.txt', 'content')

    expect(await store.exists('exists.txt')).toBe(true)
    expect(await store.exists('missing.txt')).toBe(false)
  })
})

describe('LocalStore - Advanced Operations', () => {
  it('should copy file', async () => {
    await store.put('original.txt', 'original content')
    await store.copy('original.txt', 'copied.txt')

    expect(await store.exists('copied.txt')).toBe(true)
    expect(await (await store.get('copied.txt'))?.text()).toBe('original content')

    expect(await store.exists('original.txt')).toBe(true)
  })

  it('should throw when copying non-existent file', async () => {
    await expect(store.copy('non-existent.txt', 'dest.txt')).rejects.toThrow()
  })

  it('should move file', async () => {
    await store.put('source.txt', 'move me')
    await store.move('source.txt', 'destination.txt')

    expect(await store.exists('source.txt')).toBe(false)
    expect(await store.exists('destination.txt')).toBe(true)
    expect(await (await store.get('destination.txt'))?.text()).toBe('move me')
  })
})

describe('LocalStore - Metadata', () => {
  it('should get file metadata', async () => {
    await store.put('metadata.txt', 'hello world')

    const meta = await store.getMetadata('metadata.txt')

    expect(meta).toMatchObject({
      key: 'metadata.txt',
      size: 11,
      mimeType: 'text/plain',
    })
    expect(meta?.lastModified).toBeInstanceOf(Date)
  })

  it('should return null for non-existent file metadata', async () => {
    const meta = await store.getMetadata('non-existent.txt')
    expect(meta).toBeNull()
  })

  it('should guess MIME types correctly', async () => {
    const tests = [
      { key: 'file.txt', expected: 'text/plain' },
      { key: 'file.json', expected: 'application/json' },
      { key: 'file.png', expected: 'image/png' },
      { key: 'file.jpg', expected: 'image/jpeg' },
      { key: 'file.pdf', expected: 'application/pdf' },
      { key: 'file.unknown', expected: 'application/octet-stream' },
    ]

    for (const test of tests) {
      await store.put(test.key, 'content')
      const meta = await store.getMetadata(test.key)
      expect(meta?.mimeType).toBe(test.expected)
    }
  })
})

describe('LocalStore - URL Generation', () => {
  it('should generate correct URLs', () => {
    expect(store.getUrl('file.txt')).toBe('/storage/file.txt')
    expect(store.getUrl('dir/file.txt')).toBe('/storage/dir/file.txt')
  })
})

describe('LocalStore - list (not implemented)', () => {
  it('should throw "not yet implemented" error when calling list()', () => {
    expect(() => store.list()).toThrow('[LocalStore] list() is not yet implemented.')
  })

  it('should throw "not yet implemented" error when calling list() with prefix', () => {
    expect(() => store.list('some/prefix')).toThrow('[LocalStore] list() is not yet implemented.')
  })
})

describe('LocalStore - backup/restore', () => {
  let backupDir: string
  let backupStore: LocalStore

  beforeEach(async () => {
    backupDir = await mkdtemp(join(tmpdir(), 'nebula-backup-'))
    backupStore = new LocalStore(backupDir, '/backup')
  })

  afterEach(async () => {
    if (backupDir) {
      await rm(backupDir, { recursive: true, force: true })
    }
  })

  it('backup creates tar.gz with all files', async () => {
    // 放入一些測試檔案
    await backupStore.put('a.txt', 'content-a')
    await backupStore.put('b.txt', 'content-b')

    const archivePath = join(tmpdir(), `nebula-backup-test-${Date.now()}.tar.gz`)

    // Mock getArchiveAdapter，記錄傳入的 entries
    let capturedEntries: Record<string, unknown> = {}
    const mockAdapter = {
      create: mock(async (entries: Record<string, unknown>) => {
        capturedEntries = entries
        return new Uint8Array([0x1f, 0x8b, 0x08, 0x00])
      }),
      extract: mock(async () => 0),
      list: mock(async () => new Map()),
      readFile: mock(async () => null),
    }
    const spy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(mockAdapter as any)

    await backupStore.backup(archivePath)

    // 確認 create 被呼叫，且包含兩個檔案
    expect(mockAdapter.create).toHaveBeenCalled()
    expect(Object.keys(capturedEntries).some((k) => k.includes('a.txt'))).toBe(true)
    expect(Object.keys(capturedEntries).some((k) => k.includes('b.txt'))).toBe(true)

    spy.mockRestore()
    await rm(archivePath, { force: true })
  })

  it('restore extracts backup and restores data', async () => {
    const archivePath = join(tmpdir(), `nebula-restore-test-${Date.now()}.tar.gz`)

    // 模擬一個含有 restored.txt 的歸檔，提取後寫入 backupDir
    const mockAdapter = {
      create: mock(async () => new Uint8Array([0x1f, 0x8b])),
      extract: mock(async (_data: unknown, targetDir: string) => {
        // 模擬提取：直接在 targetDir 建立一個檔案
        await writeFile(join(targetDir, 'restored.txt'), 'restored-content')
        return 1
      }),
      list: mock(async () => new Map()),
      readFile: mock(async () => null),
    }

    // 建立假的 archive 檔案（實際不需要真實 gzip）
    await writeFile(archivePath, 'fake-archive')

    const spy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(mockAdapter as any)

    await backupStore.restore(archivePath)

    // 確認 extract 被呼叫
    expect(mockAdapter.extract).toHaveBeenCalled()

    // 確認還原的檔案存在
    const restoredContent = await backupStore.get('restored.txt')
    expect(restoredContent).not.toBeNull()
    expect(await restoredContent?.text()).toBe('restored-content')

    spy.mockRestore()
    await rm(archivePath, { force: true })
  })

  it('restore overwrites existing files', async () => {
    // 先放入舊版檔案
    await backupStore.put('file.txt', 'old-content')

    const archivePath = join(tmpdir(), `nebula-overwrite-test-${Date.now()}.tar.gz`)

    const mockAdapter = {
      create: mock(async () => new Uint8Array()),
      extract: mock(async (_data: unknown, targetDir: string) => {
        // 提取新版本
        await writeFile(join(targetDir, 'file.txt'), 'new-content')
        return 1
      }),
      list: mock(async () => new Map()),
      readFile: mock(async () => null),
    }

    await writeFile(archivePath, 'fake-archive')

    const spy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(mockAdapter as any)

    await backupStore.restore(archivePath)

    // 確認舊內容已被覆蓋
    const result = await backupStore.get('file.txt')
    expect(await result?.text()).toBe('new-content')

    spy.mockRestore()
    await rm(archivePath, { force: true })
  })

  it('restore cleans up temporary directory', async () => {
    const archivePath = join(tmpdir(), `nebula-cleanup-test-${Date.now()}.tar.gz`)

    let extractTargetDir = ''
    const mockAdapter = {
      create: mock(async () => new Uint8Array()),
      extract: mock(async (_data: unknown, targetDir: string) => {
        extractTargetDir = targetDir
        return 0
      }),
      list: mock(async () => new Map()),
      readFile: mock(async () => null),
    }

    await writeFile(archivePath, 'fake-archive')

    const spy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(mockAdapter as any)

    await backupStore.restore(archivePath)

    // 確認臨時目錄已被清理
    if (extractTargetDir) {
      const { existsSync } = await import('node:fs')
      expect(existsSync(extractTargetDir)).toBe(false)
    }

    spy.mockRestore()
    await rm(archivePath, { force: true })
  })
})

describe('LocalStore - Nested Directories', () => {
  it('should handle nested directory structures', async () => {
    await store.put('deep/nested/dir/file.txt', 'deep content')

    expect(await store.exists('deep/nested/dir/file.txt')).toBe(true)
    expect(await (await store.get('deep/nested/dir/file.txt'))?.text()).toBe('deep content')
  })
})

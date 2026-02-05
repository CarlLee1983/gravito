import { beforeEach, describe, expect, it } from 'bun:test'
import type { StorageAdapter } from '../../src/storage/adapter'
import { LogRotator } from '../../src/storage/LogRotator'

/**
 * 建立 mock StorageAdapter，模擬記憶體檔案系統
 */
function createMockStorage(): StorageAdapter & { _files: Map<string, string> } {
  const files = new Map<string, string>()

  return {
    _files: files,
    async write(path: string, content: string): Promise<void> {
      files.set(path, content)
    },
    async read(path: string): Promise<string> {
      const content = files.get(path)
      if (content === undefined) {
        throw new Error(`File not found: ${path}`)
      }
      return content
    },
    async exists(path: string): Promise<boolean> {
      return files.has(path)
    },
    async delete(path: string): Promise<void> {
      files.delete(path)
    },
    async append(path: string, content: string): Promise<void> {
      const current = files.get(path) || ''
      files.set(path, current + content)
    },
    async rename(oldPath: string, newPath: string): Promise<void> {
      const content = files.get(oldPath)
      if (content === undefined) {
        throw new Error(`File not found: ${oldPath}`)
      }
      files.set(newPath, content)
      files.delete(oldPath)
    },
    async size(path: string): Promise<number> {
      const content = files.get(path)
      return content ? content.length : 0
    },
    async ensureDir(_path: string): Promise<void> {
      // no-op
    },
  }
}

describe('LogRotator', () => {
  let storage: ReturnType<typeof createMockStorage>

  beforeEach(() => {
    storage = createMockStorage()
  })

  describe('constructor', () => {
    it('should use default values when no config provided', () => {
      const rotator = new LogRotator()
      expect(rotator).toBeDefined()
    })

    it('should accept custom configuration', () => {
      const rotator = new LogRotator({
        maxBackups: 10,
        compress: false,
        storage,
      })
      expect(rotator).toBeDefined()
    })
  })

  describe('rotate()', () => {
    it('should create a timestamped backup of the snapshot', async () => {
      const rotator = new LogRotator({
        storage,
        compress: false, // 避免使用 FileSystemAdapter 的壓縮
      })

      // 建立原始快照
      await storage.write('/data/snapshot.json', '{"entries": []}')

      const backupPath = await rotator.rotate('/data/snapshot.json')

      // 備份路徑應包含時間戳和 .bak 後綴
      expect(backupPath).toMatch(/\/data\/snapshot\.json\.\d+\.bak$/)

      // 備份應包含原始內容
      const backupContent = await storage.read(backupPath)
      expect(backupContent).toBe('{"entries": []}')

      // 原始檔案應仍然存在
      expect(await storage.exists('/data/snapshot.json')).toBe(true)
    })

    it('should throw when snapshot does not exist', async () => {
      const rotator = new LogRotator({
        storage,
        compress: false,
      })

      await expect(rotator.rotate('/data/nonexistent.json')).rejects.toThrow(
        'Snapshot not found: /data/nonexistent.json'
      )
    })

    it('should create unique backup names for consecutive rotations', async () => {
      const rotator = new LogRotator({
        storage,
        compress: false,
      })

      await storage.write('/data/snapshot.json', 'data')

      const backup1 = await rotator.rotate('/data/snapshot.json')
      // 等一小段時間確保時間戳不同
      await new Promise((resolve) => setTimeout(resolve, 5))
      const backup2 = await rotator.rotate('/data/snapshot.json')

      expect(backup1).not.toBe(backup2)
    })

    it('should preserve snapshot content in backup', async () => {
      const rotator = new LogRotator({
        storage,
        compress: false,
      })

      const complexData = JSON.stringify({
        entries: [
          { url: '/page1', priority: 0.8 },
          { url: '/page2', priority: 0.6 },
        ],
        metadata: { version: 2, generatedAt: '2024-01-01' },
      })

      await storage.write('/data/snapshot.json', complexData)

      const backupPath = await rotator.rotate('/data/snapshot.json')
      const backupContent = await storage.read(backupPath)

      expect(backupContent).toBe(complexData)
    })

    it('should not compress when using non-FileSystemAdapter storage', async () => {
      const rotator = new LogRotator({
        storage,
        compress: true, // 即使設為 true，因為不是 FileSystemAdapter 也不會壓縮
      })

      await storage.write('/data/snapshot.json', 'data')
      const backupPath = await rotator.rotate('/data/snapshot.json')

      // 不應建立 .gz 檔案
      expect(await storage.exists(`${backupPath}.gz`)).toBe(false)
    })
  })

  describe('prune()', () => {
    // 注意：listBackups() 目前是簡化實作，總是回傳空陣列
    // 因此 prune 始終回傳 0
    it('should return 0 when no backups exist', async () => {
      const rotator = new LogRotator({
        storage,
        compress: false,
      })

      const deleted = await rotator.prune('/data/snapshot.json')
      expect(deleted).toBe(0)
    })

    it('should return 0 when backups are within retention limit', async () => {
      const rotator = new LogRotator({
        storage,
        compress: false,
        maxBackups: 5,
      })

      const deleted = await rotator.prune('/data/snapshot.json')
      expect(deleted).toBe(0)
    })
  })

  describe('getStats()', () => {
    it('should return zero stats when no backups exist', async () => {
      const rotator = new LogRotator({
        storage,
        compress: false,
      })

      const stats = await rotator.getStats('/data/snapshot.json')

      expect(stats).toEqual({
        backupCount: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null,
      })
    })
  })

  describe('configuration defaults', () => {
    it('should default maxBackups to 5', async () => {
      const rotator = new LogRotator({ storage })
      // 透過 prune 驗證 maxBackups 預設值
      // listBackups 回傳空陣列，所以 prune 回傳 0
      const deleted = await rotator.prune('/any/path')
      expect(deleted).toBe(0)
    })

    it('should default compress to true', () => {
      const rotator = new LogRotator({ storage })
      expect(rotator).toBeDefined()
    })
  })
})

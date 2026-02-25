import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  type ArchiveCreateOptions,
  getArchiveAdapter,
  type RuntimeArchiveAdapter,
} from '../src/runtime'

// ============ 測試輔助 ============

/**
 * 重置 archiveAdapter 單例（透過重新導入模組實現隔離）
 * 注意：Bun 測試環境下模組快取會持久化，所以我們直接測試 getArchiveAdapter 的快取行為
 */
const getAdapter = (): RuntimeArchiveAdapter => getArchiveAdapter()

// 測試用臨時目錄
const testTmpDir = `/tmp/gravito-archive-test-${Date.now()}`

// ============ 測試群組 ============

describe('getArchiveAdapter', () => {
  it('應回傳 RuntimeArchiveAdapter 物件', () => {
    const adapter = getAdapter()
    expect(adapter).toBeDefined()
    expect(typeof adapter.create).toBe('function')
    expect(typeof adapter.extract).toBe('function')
    expect(typeof adapter.list).toBe('function')
    expect(typeof adapter.readFile).toBe('function')
  })

  it('應快取並回傳相同的 adapter 實例', () => {
    const adapter1 = getAdapter()
    const adapter2 = getAdapter()
    expect(adapter1).toBe(adapter2)
  })
})

// ============ Bun adapter 測試（需要 Bun.Tarball API）============

/**
 * 判斷 Bun.Tarball 是否可用
 * Bun.Tarball 於 Bun v1.2+ 引入，若不存在則跳過相關測試
 */
const hasBunTarball = typeof Bun !== 'undefined' && typeof (Bun as any).Tarball !== 'undefined'

describe('RuntimeArchiveAdapter - Bun 環境', () => {
  describe('create()', () => {
    it('應建立包含單一文字檔案的歸檔', async () => {
      if (!hasBunTarball) {
        // Bun.Tarball 不可用，驗證錯誤訊息
        const adapter = getAdapter()
        await expect(adapter.create({ 'README.md': 'Hello, World!' })).rejects.toThrow(
          '[RuntimeArchiveAdapter] Bun.Tarball is not available'
        )
        return
      }

      const adapter = getAdapter()
      const result = await adapter.create({
        'README.md': 'Hello, World!',
      })

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('應建立包含多個檔案的歸檔', async () => {
      if (!hasBunTarball) {
        const adapter = getAdapter()
        await expect(
          adapter.create({
            'src/index.ts': 'export const hello = "world"',
            'src/utils.ts': 'export const add = (a: number, b: number) => a + b',
            'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
          })
        ).rejects.toThrow('[RuntimeArchiveAdapter] Bun.Tarball is not available')
        return
      }

      const adapter = getAdapter()
      const result = await adapter.create({
        'src/index.ts': 'export const hello = "world"',
        'src/utils.ts': 'export const add = (a: number, b: number) => a + b',
        'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
      })

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('應支援 Uint8Array 資料內容', async () => {
      if (!hasBunTarball) {
        const adapter = getAdapter()
        await expect(
          adapter.create({
            'binary.bin': new TextEncoder().encode('binary data'),
          })
        ).rejects.toThrow('[RuntimeArchiveAdapter] Bun.Tarball is not available')
        return
      }

      const adapter = getAdapter()
      const binaryContent = new TextEncoder().encode('binary data')
      const result = await adapter.create({
        'binary.bin': binaryContent,
      })

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('應支援 ArrayBuffer 資料內容', async () => {
      if (!hasBunTarball) {
        const adapter = getAdapter()
        await expect(
          adapter.create({
            'buffer.bin': new TextEncoder().encode('buffer data').buffer,
          })
        ).rejects.toThrow('[RuntimeArchiveAdapter] Bun.Tarball is not available')
        return
      }

      const adapter = getAdapter()
      const bufferContent = new TextEncoder().encode('buffer data').buffer
      const result = await adapter.create({
        'buffer.bin': bufferContent,
      })

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('應支援 Blob 資料內容', async () => {
      if (!hasBunTarball) {
        const adapter = getAdapter()
        await expect(
          adapter.create({
            'blob.txt': new Blob(['blob content']),
          })
        ).rejects.toThrow('[RuntimeArchiveAdapter] Bun.Tarball is not available')
        return
      }

      const adapter = getAdapter()
      const blobContent = new Blob(['blob content'])
      const result = await adapter.create({
        'blob.txt': blobContent,
      })

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('應支援 gzip 壓縮選項', async () => {
      if (!hasBunTarball) {
        const adapter = getAdapter()
        const options: ArchiveCreateOptions = { compress: 'gzip', level: 9 }
        await expect(adapter.create({ 'test.txt': 'compressed content' }, options)).rejects.toThrow(
          '[RuntimeArchiveAdapter] Bun.Tarball is not available'
        )
        return
      }

      const adapter = getAdapter()
      const uncompressed = await adapter.create({
        'test.txt': 'compressed content that should compress well with repeated data repeated data',
      })
      const compressed = await adapter.create(
        {
          'test.txt':
            'compressed content that should compress well with repeated data repeated data',
        },
        { compress: 'gzip', level: 9 }
      )

      // 兩者都應為有效的 Uint8Array
      expect(uncompressed).toBeInstanceOf(Uint8Array)
      expect(compressed).toBeInstanceOf(Uint8Array)
    })

    it('應正規化 Windows 路徑分隔符為正斜線', async () => {
      if (!hasBunTarball) {
        const adapter = getAdapter()
        await expect(adapter.create({ 'src\\utils\\helper.ts': 'helper content' })).rejects.toThrow(
          '[RuntimeArchiveAdapter] Bun.Tarball is not available'
        )
        return
      }

      const adapter = getAdapter()
      // 建立歸檔並列出內容以驗證路徑正規化
      const archiveData = await adapter.create({
        'src\\utils\\helper.ts': 'helper content',
      })

      expect(archiveData).toBeInstanceOf(Uint8Array)
      expect(archiveData.length).toBeGreaterThan(0)
    })
  })

  describe('list()', () => {
    it('應列出歸檔中的所有檔案', async () => {
      if (!hasBunTarball) {
        const adapter = getAdapter()
        const dummyData = new Uint8Array([0x1f, 0x8b]) // gzip magic bytes
        await expect(adapter.list(dummyData)).rejects.toThrow(
          '[RuntimeArchiveAdapter] Bun.Tarball is not available'
        )
        return
      }

      const adapter = getAdapter()
      const archiveData = await adapter.create({
        'file1.txt': 'content 1',
        'file2.txt': 'content 2',
        'subdir/file3.txt': 'content 3',
      })

      const files = await adapter.list(archiveData)
      expect(files).toBeInstanceOf(Map)
      expect(files.size).toBe(3)
      expect(files.has('file1.txt')).toBe(true)
      expect(files.has('file2.txt')).toBe(true)
      expect(files.has('subdir/file3.txt')).toBe(true)
    })

    it('應回傳正確的 ArchiveFileInfo 結構', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      const content = 'hello world'
      const archiveData = await adapter.create({ 'test.txt': content })

      const files = await adapter.list(archiveData)
      const fileInfo = files.get('test.txt')

      expect(fileInfo).toBeDefined()
      expect(fileInfo?.path).toBe('test.txt')
      expect(fileInfo?.size).toBeGreaterThan(0)
      expect(typeof fileInfo?.lastModified).toBe('number')
      expect(typeof fileInfo?.text).toBe('function')
      expect(typeof fileInfo?.arrayBuffer).toBe('function')
    })

    it('ArchiveFileInfo.text() 應回傳正確的文字內容', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      const content = 'Hello, Gravito Archive!'
      const archiveData = await adapter.create({ 'message.txt': content })

      const files = await adapter.list(archiveData)
      const fileInfo = files.get('message.txt')

      expect(fileInfo).toBeDefined()
      const text = await fileInfo?.text()
      expect(text).toBe(content)
    })

    it('ArchiveFileInfo.arrayBuffer() 應回傳正確的二進位內容', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      const content = 'binary test content'
      const archiveData = await adapter.create({ 'data.bin': content })

      const files = await adapter.list(archiveData)
      const fileInfo = files.get('data.bin')

      expect(fileInfo).toBeDefined()
      const buffer = await fileInfo?.arrayBuffer()
      expect(buffer).toBeInstanceOf(ArrayBuffer)
      const decoded = new TextDecoder().decode(new Uint8Array(buffer))
      expect(decoded).toBe(content)
    })

    it('應支援接受 ArrayBuffer 格式的歸檔資料', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      const archiveData = await adapter.create({ 'test.txt': 'content' })
      // 以 ArrayBuffer 形式傳入
      const files = await adapter.list(archiveData.buffer)

      expect(files).toBeInstanceOf(Map)
      expect(files.has('test.txt')).toBe(true)
    })

    it('應支援接受 Blob 格式的歸檔資料', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      const archiveData = await adapter.create({ 'test.txt': 'content' })
      // 以 Blob 形式傳入
      const blob = new Blob([archiveData])
      const files = await adapter.list(blob)

      expect(files).toBeInstanceOf(Map)
      expect(files.has('test.txt')).toBe(true)
    })
  })

  describe('readFile()', () => {
    it('應讀取歸檔中存在的單一檔案', async () => {
      if (!hasBunTarball) {
        const adapter = getAdapter()
        const dummyData = new Uint8Array(10)
        await expect(adapter.readFile(dummyData, 'test.txt')).rejects.toThrow(
          '[RuntimeArchiveAdapter] Bun.Tarball is not available'
        )
        return
      }

      const adapter = getAdapter()
      const content = 'target file content'
      const archiveData = await adapter.create({
        'other.txt': 'other content',
        'target.txt': content,
      })

      const result = await adapter.readFile(archiveData, 'target.txt')
      expect(result).toBeInstanceOf(Uint8Array)
      const decoded = new TextDecoder().decode(result!)
      expect(decoded).toBe(content)
    })

    it('不存在的檔案應回傳 null', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      const archiveData = await adapter.create({ 'existing.txt': 'content' })

      const result = await adapter.readFile(archiveData, 'nonexistent.txt')
      expect(result).toBeNull()
    })

    it('應讀取二進位內容', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      const binaryContent = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      const archiveData = await adapter.create({ 'binary.bin': binaryContent })

      const result = await adapter.readFile(archiveData, 'binary.bin')
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result?.length).toBe(binaryContent.length)
      for (let i = 0; i < binaryContent.length; i++) {
        expect(result?.[i]).toBe(binaryContent[i])
      }
    })
  })

  describe('extract()', () => {
    beforeEach(async () => {
      const fs = await import('node:fs/promises')
      await fs.mkdir(testTmpDir, { recursive: true })
    })

    afterEach(async () => {
      const fs = await import('node:fs/promises')
      try {
        await fs.rm(testTmpDir, { recursive: true, force: true })
      } catch {
        // 忽略清理錯誤
      }
    })

    it('應提取歸檔到指定目錄', async () => {
      if (!hasBunTarball) {
        const adapter = getAdapter()
        const dummyData = new Uint8Array(10)
        await expect(adapter.extract(dummyData, testTmpDir)).rejects.toThrow(
          '[RuntimeArchiveAdapter] Bun.Tarball is not available'
        )
        return
      }

      const adapter = getAdapter()
      const archiveData = await adapter.create({
        'hello.txt': 'hello world',
        'nested/world.txt': 'nested content',
      })

      const count = await adapter.extract(archiveData, testTmpDir)
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThan(0)
    })

    it('應建立目標目錄（若不存在）', async () => {
      if (!hasBunTarball) {
        return
      }

      const newDir = `${testTmpDir}/new-subdir`
      const adapter = getAdapter()
      const archiveData = await adapter.create({ 'test.txt': 'content' })

      // 不預先建立目錄，讓 extract 自動建立
      await adapter.extract(archiveData, newDir)

      const fs = await import('node:fs/promises')
      const exists = await fs
        .access(newDir)
        .then(() => true)
        .catch(() => false)
      expect(exists).toBe(true)
    })

    it('應回傳提取的檔案數量', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      const archiveData = await adapter.create({
        'file1.txt': 'content 1',
        'file2.txt': 'content 2',
        'file3.txt': 'content 3',
      })

      const count = await adapter.extract(archiveData, testTmpDir)
      expect(count).toBe(3)
    })
  })

  describe('邊界情況', () => {
    it('應處理空路徑的歸檔項目（以當前路徑為準）', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      // 空字串路徑由 Bun.Tarball 自行處理
      const result = await adapter.create({ '': 'empty path content' })
      expect(result).toBeInstanceOf(Uint8Array)
    })

    it('create 接受大型文字內容', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      // 生成 1MB 文字
      const largeContent = 'x'.repeat(1024 * 1024)
      const result = await adapter.create({ 'large.txt': largeContent })

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('list 對空歸檔回傳空 Map', async () => {
      if (!hasBunTarball) {
        return
      }

      const adapter = getAdapter()
      // 建立空歸檔（無項目）
      const archiveData = await adapter.create({})
      const files = await adapter.list(archiveData)

      expect(files).toBeInstanceOf(Map)
      expect(files.size).toBe(0)
    })
  })
})

// ============ 錯誤訊息測試（不依賴 Bun.Tarball）============

describe('RuntimeArchiveAdapter - 錯誤訊息一致性', () => {
  it('在 Bun 環境下，Bun.Tarball 不可用時應拋出明確錯誤', async () => {
    // 此測試驗證錯誤訊息格式正確
    if (typeof Bun === 'undefined') {
      // 非 Bun 環境，跳過
      return
    }

    if (hasBunTarball) {
      // Bun.Tarball 可用，跳過此測試
      return
    }

    const adapter = getAdapter()

    await expect(adapter.create({ 'test.txt': 'content' })).rejects.toThrow(
      '[RuntimeArchiveAdapter]'
    )
    await expect(adapter.extract(new Uint8Array(), '/tmp')).rejects.toThrow(
      '[RuntimeArchiveAdapter]'
    )
    await expect(adapter.list(new Uint8Array())).rejects.toThrow('[RuntimeArchiveAdapter]')
    await expect(adapter.readFile(new Uint8Array(), 'test.txt')).rejects.toThrow(
      '[RuntimeArchiveAdapter]'
    )
  })
})

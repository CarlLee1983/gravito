import { beforeEach, describe, expect, it } from 'bun:test'
import { MongoGridFS } from '../dist/index.js'

// ===== Mock Stream Classes =====

class MockUploadStream {
  id = { toString: () => 'mock-file-id-123' }
  private handlers: Record<string, ((...args: unknown[]) => void)[]> = {}
  writtenChunks: Buffer[] = []
  ended = false
  aborted = false
  private _shouldError: boolean

  constructor(options?: { shouldError?: boolean; fileId?: string }) {
    this._shouldError = options?.shouldError ?? false
    if (options?.fileId) {
      this.id = { toString: () => options.fileId! }
    }
  }

  write(data: Buffer | Uint8Array) {
    this.writtenChunks.push(Buffer.from(data))
  }

  end() {
    this.ended = true
    setTimeout(() => {
      if (this._shouldError) {
        this._emit('error', new Error('Upload stream error'))
      } else {
        this._emit('finish')
      }
    }, 0)
  }

  on(event: string, handler: (...args: unknown[]) => void) {
    if (!this.handlers[event]) {
      this.handlers[event] = []
    }
    this.handlers[event].push(handler)
    return this
  }

  abort() {
    this.aborted = true
  }

  private _emit(event: string, ...args: unknown[]) {
    const handlers = this.handlers[event] ?? []
    for (const handler of handlers) {
      handler(...args)
    }
  }
}

class MockDownloadStream {
  private handlers: Record<string, ((...args: unknown[]) => void)[]> = {}
  private _data: Buffer
  private _shouldError: boolean

  constructor(data: Buffer = Buffer.from('test content'), shouldError = false) {
    this._data = data
    this._shouldError = shouldError
    setTimeout(() => {
      if (this._shouldError) {
        this._emit('error', new Error('Download stream error'))
      } else {
        this._emit('data', this._data)
        this._emit('end')
      }
    }, 0)
  }

  on(event: string, handler: (...args: unknown[]) => void) {
    if (!this.handlers[event]) {
      this.handlers[event] = []
    }
    this.handlers[event].push(handler)
    return this
  }

  private _emit(event: string, ...args: unknown[]) {
    const handlers = this.handlers[event] ?? []
    for (const handler of handlers) {
      handler(...args)
    }
  }
}

// ===== Mock GridFS Bucket =====

class MockGridFSBucket {
  uploadStreamOptions: { shouldError?: boolean; fileId?: string } = {}
  downloadData: Buffer = Buffer.from('test content')
  downloadShouldError = false
  findResults: unknown[] = []
  deleteError: Error | null = null
  lastUploadStream: MockUploadStream | null = null
  lastUploadFilename: string | null = null
  lastUploadOpts: Record<string, unknown> | null = null
  lastDeleteId: unknown = null
  lastFindFilter: unknown = null

  openUploadStream(filename: string, options?: Record<string, unknown>): MockUploadStream {
    this.lastUploadFilename = filename
    this.lastUploadOpts = options ?? null
    this.lastUploadStream = new MockUploadStream(this.uploadStreamOptions)
    return this.lastUploadStream
  }

  openDownloadStream(_objectId: unknown): MockDownloadStream {
    return new MockDownloadStream(this.downloadData, this.downloadShouldError)
  }

  find(filter?: Record<string, unknown>) {
    this.lastFindFilter = filter
    return { toArray: async () => this.findResults }
  }

  async delete(objectId: unknown) {
    this.lastDeleteId = objectId
    if (this.deleteError) {
      throw this.deleteError
    }
  }
}

// ===== 建立已注入 mock bucket 的 GridFS 實例 =====

function createMockGridFS(): { gridfs: MongoGridFS; mockBucket: MockGridFSBucket } {
  const gridfs = Object.create(MongoGridFS.prototype) as MongoGridFS
  const mockBucket = new MockGridFSBucket()
  // 直接設定 bucket，跳過 constructor 的 initBucket（避免 mongodb 模組衝突）
  Object.defineProperty(gridfs, 'bucket', { value: mockBucket, writable: true })
  return { gridfs, mockBucket }
}

describe('MongoGridFS 完整 Mock 測試', () => {
  let gridfs: MongoGridFS
  let mockBucket: MockGridFSBucket

  beforeEach(() => {
    const created = createMockGridFS()
    gridfs = created.gridfs
    mockBucket = created.mockBucket
  })

  // ========== ensureBucket ==========

  describe('ensureBucket', () => {
    it('當 bucket 未初始化時應該拋出錯誤', async () => {
      const emptyGridfs = Object.create(MongoGridFS.prototype) as MongoGridFS
      // bucket 為 undefined，ensureBucket 會拋出

      await expect(
        emptyGridfs.upload(Buffer.from('test'), { filename: 'test.txt' })
      ).rejects.toThrow('GridFS bucket not initialized')
    })
  })

  // ========== Upload ==========

  describe('upload', () => {
    it('應該上傳 Buffer 並返回檔案 ID', async () => {
      const content = Buffer.from('Hello GridFS Mock')
      const fileId = await gridfs.upload(content, { filename: 'test.txt' })

      expect(fileId).toBe('mock-file-id-123')
      expect(mockBucket.lastUploadFilename).toBe('test.txt')
      expect(mockBucket.lastUploadStream?.writtenChunks).toHaveLength(1)
      expect(mockBucket.lastUploadStream?.writtenChunks[0].toString()).toBe('Hello GridFS Mock')
      expect(mockBucket.lastUploadStream?.ended).toBe(true)
    })

    it('應該傳遞 chunkSizeBytes、metadata 和 contentType 選項', async () => {
      await gridfs.upload(Buffer.from('test'), {
        filename: 'doc.pdf',
        chunkSizeBytes: 512 * 1024,
        metadata: { author: 'Test' },
        contentType: 'application/pdf',
      })

      expect(mockBucket.lastUploadOpts).toEqual({
        chunkSizeBytes: 512 * 1024,
        metadata: { author: 'Test' },
        contentType: 'application/pdf',
      })
    })

    it('應該上傳 ReadableStream', async () => {
      const chunks = ['Hello ', 'World!']
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk))
          }
          controller.close()
        },
      })

      const fileId = await gridfs.upload(stream, { filename: 'stream.txt' })

      expect(fileId).toBe('mock-file-id-123')
      expect(mockBucket.lastUploadStream?.writtenChunks).toHaveLength(2)
      expect(mockBucket.lastUploadStream?.ended).toBe(true)
    })

    it('當上傳串流發生錯誤時應該 reject', async () => {
      mockBucket.uploadStreamOptions = { shouldError: true }

      await expect(gridfs.upload(Buffer.from('test'), { filename: 'error.txt' })).rejects.toThrow(
        'Upload stream error'
      )
    })
  })

  // ========== Download ==========

  describe('download', () => {
    it('應該下載檔案並返回 Buffer', async () => {
      mockBucket.downloadData = Buffer.from('Downloaded content')
      const result = await gridfs.download('507f1f77bcf86cd799439011')

      expect(result.toString()).toBe('Downloaded content')
    })

    it('當下載串流發生錯誤時應該 reject', async () => {
      mockBucket.downloadShouldError = true

      await expect(gridfs.download('507f1f77bcf86cd799439011')).rejects.toThrow(
        'Download stream error'
      )
    })
  })

  // ========== Delete ==========

  describe('delete', () => {
    it('應該刪除指定檔案', async () => {
      await gridfs.delete('507f1f77bcf86cd799439011')

      expect(mockBucket.lastDeleteId).toBeDefined()
      expect(mockBucket.lastDeleteId?.toString()).toBe('507f1f77bcf86cd799439011')
    })

    it('當刪除失敗時應該拋出錯誤', async () => {
      mockBucket.deleteError = new Error('File not found')

      await expect(gridfs.delete('507f1f77bcf86cd799439011')).rejects.toThrow('File not found')
    })
  })

  // ========== List ==========

  describe('list', () => {
    it('應該列出所有檔案', async () => {
      mockBucket.findResults = [
        { _id: 'id-1', filename: 'file1.txt', length: 100 },
        { _id: 'id-2', filename: 'file2.txt', length: 200 },
      ]

      const files = await gridfs.list()

      expect(files).toHaveLength(2)
      expect(files[0].filename).toBe('file1.txt')
      expect(mockBucket.lastFindFilter).toEqual({})
    })

    it('應該支援過濾查詢', async () => {
      mockBucket.findResults = [
        { _id: 'id-1', filename: 'doc.pdf', contentType: 'application/pdf' },
      ]

      const files = await gridfs.list({ contentType: 'application/pdf' })

      expect(files).toHaveLength(1)
      expect(mockBucket.lastFindFilter).toEqual({
        contentType: 'application/pdf',
      })
    })

    it('當沒有檔案時應該返回空陣列', async () => {
      mockBucket.findResults = []
      const files = await gridfs.list()
      expect(files).toEqual([])
    })
  })

  // ========== FindById ==========

  describe('findById', () => {
    it('應該根據 ID 查找檔案', async () => {
      mockBucket.findResults = [
        {
          _id: '507f1f77bcf86cd799439011',
          filename: 'found.txt',
          length: 42,
          uploadDate: new Date(),
        },
      ]

      const file = await gridfs.findById('507f1f77bcf86cd799439011')

      expect(file).not.toBeNull()
      expect(file?.filename).toBe('found.txt')
      expect(file?.length).toBe(42)
    })

    it('找不到檔案時應該返回 null', async () => {
      mockBucket.findResults = []
      const file = await gridfs.findById('507f1f77bcf86cd799439011')
      expect(file).toBeNull()
    })
  })

  // ========== UploadStream ==========

  describe('uploadStream', () => {
    it('應該透過串流上傳並返回檔案 ID', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Stream content'))
          controller.close()
        },
      })

      const fileId = await gridfs.uploadStream(stream, {
        filename: 'stream-upload.txt',
      })

      expect(fileId).toBe('mock-file-id-123')
      expect(mockBucket.lastUploadStream?.writtenChunks).toHaveLength(1)
      expect(mockBucket.lastUploadStream?.ended).toBe(true)
    })

    it('應該呼叫 onProgress 回調', async () => {
      const chunks = ['chunk1', 'chunk2', 'chunk3']
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk))
          }
          controller.close()
        },
      })

      const progressUpdates: { bytesWritten: number; totalBytes: number; percentage: number }[] = []
      await gridfs.uploadStream(stream, { filename: 'progress.txt' }, (progress) =>
        progressUpdates.push({ ...progress })
      )

      expect(progressUpdates).toHaveLength(3)
      expect(progressUpdates[0].bytesWritten).toBeGreaterThan(0)
      expect(progressUpdates[0].totalBytes).toBe(0)
      expect(progressUpdates[0].percentage).toBe(0)
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].bytesWritten).toBeGreaterThan(progressUpdates[i - 1].bytesWritten)
      }
    })

    it('不帶 onProgress 時也應該正常運作', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('no-progress'))
          controller.close()
        },
      })

      const fileId = await gridfs.uploadStream(stream, {
        filename: 'no-progress.txt',
      })
      expect(fileId).toBe('mock-file-id-123')
    })

    it('當串流讀取失敗時應該 abort 上傳並拋出錯誤', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream read error'))
        },
      })

      await expect(gridfs.uploadStream(stream, { filename: 'error.txt' })).rejects.toThrow(
        'Stream read error'
      )

      expect(mockBucket.lastUploadStream?.aborted).toBe(true)
    })
  })

  // ========== DownloadStream ==========

  describe('downloadStream', () => {
    it('應該返回 ReadableStream 並讀取資料', async () => {
      mockBucket.downloadData = Buffer.from('Stream download content')

      const stream = gridfs.downloadStream('507f1f77bcf86cd799439011')
      const reader = stream.getReader()
      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        chunks.push(value)
      }

      const result = Buffer.concat(chunks.map((c) => Buffer.from(c)))
      expect(result.toString()).toBe('Stream download content')
    })

    it('當下載串流發生錯誤時應該傳遞到 ReadableStream', async () => {
      mockBucket.downloadShouldError = true

      const stream = gridfs.downloadStream('507f1f77bcf86cd799439011')
      const reader = stream.getReader()

      await expect(reader.read()).rejects.toThrow('Download stream error')
    })

    it('當 bucket 未初始化時應該傳遞錯誤到 ReadableStream', async () => {
      const emptyGridfs = Object.create(MongoGridFS.prototype) as MongoGridFS
      const stream = emptyGridfs.downloadStream('507f1f77bcf86cd799439011')
      const reader = stream.getReader()

      await expect(reader.read()).rejects.toThrow('GridFS bucket not initialized')
    })
  })

  // ========== UploadLargeFile ==========

  describe('uploadLargeFile', () => {
    it('應該上傳大檔案並返回檔案 ID', async () => {
      const content = new Uint8Array(1024).fill(65)
      const blob = new Blob([content])

      const fileId = await gridfs.uploadLargeFile(blob, {
        filename: 'large.bin',
        chunkSizeBytes: 256,
      })

      expect(fileId).toBe('mock-file-id-123')
      expect(mockBucket.lastUploadFilename).toBe('large.bin')
      expect(mockBucket.lastUploadStream?.ended).toBe(true)
    })

    it('應該在 metadata 中包含 totalSize', async () => {
      const content = new Uint8Array(512).fill(66)
      const blob = new Blob([content])

      await gridfs.uploadLargeFile(blob, {
        filename: 'sized.bin',
        metadata: { owner: 'test' },
        contentType: 'application/octet-stream',
      })

      expect(mockBucket.lastUploadOpts).toMatchObject({
        metadata: { owner: 'test', totalSize: 512 },
        contentType: 'application/octet-stream',
      })
    })

    it('應該呼叫 onProgress 回調並報告百分比', async () => {
      const content = new Uint8Array(1024).fill(67)
      const blob = new Blob([content])

      const progressUpdates: { bytesWritten: number; totalBytes: number; percentage: number }[] = []
      await gridfs.uploadLargeFile(
        blob,
        { filename: 'progress-large.bin', chunkSizeBytes: 256 },
        (progress) => progressUpdates.push({ ...progress })
      )

      expect(progressUpdates.length).toBeGreaterThan(0)
      for (const p of progressUpdates) {
        expect(p.totalBytes).toBe(1024)
        expect(p.percentage).toBeGreaterThanOrEqual(0)
        expect(p.percentage).toBeLessThanOrEqual(100)
      }
      const last = progressUpdates[progressUpdates.length - 1]
      expect(last.percentage).toBe(100)
      expect(last.bytesWritten).toBe(1024)
    })

    it('應該使用預設 chunkSize 當未指定時', async () => {
      const blob = new Blob([new Uint8Array(100).fill(68)])

      await gridfs.uploadLargeFile(blob, { filename: 'default-chunk.bin' })

      expect(mockBucket.lastUploadOpts?.chunkSizeBytes).toBe(255 * 1024)
    })

    it('當串流讀取失敗時應該 abort 上傳並拋出錯誤', async () => {
      const errorBlob = {
        size: 1000,
        stream: () =>
          new ReadableStream({
            start(controller) {
              controller.error(new Error('Blob read error'))
            },
          }),
      } as unknown as Blob

      await expect(
        gridfs.uploadLargeFile(errorBlob, { filename: 'error-large.bin' })
      ).rejects.toThrow('Blob read error')

      expect(mockBucket.lastUploadStream?.aborted).toBe(true)
    })
  })
})

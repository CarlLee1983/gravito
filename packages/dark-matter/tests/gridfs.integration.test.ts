import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Mongo, MongoGridFS } from '../dist/index.js'

const MONGODB_URI = process.env.MONGODB_URI
const describeIntegration = MONGODB_URI ? describe : describe.skip

describeIntegration('GridFS Complete Features', () => {
  let gridfs: MongoGridFS

  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_gridfs_test' },
      },
    })
    await Mongo.connect()

    // 取得 native database 實例
    const db = (Mongo.database() as any).db
    gridfs = new MongoGridFS(db)
  })

  afterAll(async () => {
    if (Mongo.isConnected()) {
      await Mongo.database().dropCollection('fs.files')
      await Mongo.database().dropCollection('fs.chunks')
      await Mongo.disconnect()
    }
  })

  describe('基本上傳下載', () => {
    it('應該上傳並下載 Buffer', async () => {
      const content = Buffer.from('Hello GridFS')
      const fileId = await gridfs.upload(content, { filename: 'test.txt' })

      expect(fileId).toBeDefined()

      const downloaded = await gridfs.download(fileId)
      expect(downloaded.toString()).toBe('Hello GridFS')

      await gridfs.delete(fileId)
    })

    it('應該支援 metadata 和 contentType', async () => {
      const content = Buffer.from('Test content')
      const fileId = await gridfs.upload(content, {
        filename: 'meta-test.txt',
        metadata: { author: 'Test User', version: 1 },
        contentType: 'text/plain',
      })

      const fileInfo = await gridfs.findById(fileId)
      expect(fileInfo).not.toBeNull()
      expect(fileInfo?.filename).toBe('meta-test.txt')
      expect(fileInfo?.contentType).toBe('text/plain')
      expect(fileInfo?.metadata?.author).toBe('Test User')

      await gridfs.delete(fileId)
    })
  })

  describe('串流上傳', () => {
    it('應該支援串流上傳', async () => {
      const content = 'Stream upload test content'
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(content))
          controller.close()
        },
      })

      let progressCalled = false
      const fileId = await gridfs.uploadStream(
        stream,
        { filename: 'stream-test.txt' },
        (progress) => {
          progressCalled = true
          expect(progress.bytesWritten).toBeGreaterThan(0)
        }
      )

      expect(fileId).toBeDefined()
      expect(progressCalled).toBe(true)

      const downloaded = await gridfs.download(fileId)
      expect(downloaded.toString()).toBe(content)

      await gridfs.delete(fileId)
    })

    it('應該處理多個 chunk 的串流上傳', async () => {
      const chunks = ['Hello ', 'from ', 'streaming ', 'upload!']
      const stream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk))
          }
          controller.close()
        },
      })

      const fileId = await gridfs.uploadStream(stream, { filename: 'multi-chunk.txt' })

      const downloaded = await gridfs.download(fileId)
      expect(downloaded.toString()).toBe('Hello from streaming upload!')

      await gridfs.delete(fileId)
    })
  })

  describe('串流下載', () => {
    it('應該支援串流下載', async () => {
      const content = Buffer.from('Download stream test content')
      const fileId = await gridfs.upload(content, { filename: 'download-test.txt' })

      const stream = gridfs.downloadStream(fileId)
      const reader = stream.getReader()
      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        chunks.push(value)
      }

      const downloaded = Buffer.concat(chunks.map((c) => Buffer.from(c)))
      expect(downloaded.toString()).toBe('Download stream test content')

      await gridfs.delete(fileId)
    })

    it('應該處理大檔案的串流下載', async () => {
      // 建立一個較大的測試檔案（1MB）
      const size = 1024 * 1024 // 1MB
      const content = Buffer.alloc(size, 65) // 填充 'A'
      const fileId = await gridfs.upload(content, {
        filename: 'large-download.bin',
        chunkSizeBytes: 255 * 1024,
      })

      const stream = gridfs.downloadStream(fileId)
      const reader = stream.getReader()
      const chunks: Uint8Array[] = []
      let totalBytes = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        chunks.push(value)
        totalBytes += value.length
      }

      expect(totalBytes).toBe(size)

      await gridfs.delete(fileId)
    })
  })

  describe('大檔案上傳', () => {
    it('應該支援大檔案分片上傳', async () => {
      // 建立一個 1MB 的測試檔案
      const size = 1024 * 1024
      const content = new Uint8Array(size).fill(65) // 填充 'A'
      const blob = new Blob([content])

      const progressUpdates: number[] = []
      const fileId = await gridfs.uploadLargeFile(
        blob,
        { filename: 'large-file.bin', chunkSizeBytes: 255 * 1024 },
        (progress) => {
          progressUpdates.push(progress.percentage)
          expect(progress.bytesWritten).toBeGreaterThan(0)
          expect(progress.totalBytes).toBe(size)
        }
      )

      expect(fileId).toBeDefined()
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100)

      // 驗證檔案大小
      const fileInfo = await gridfs.findById(fileId)
      expect(fileInfo?.length).toBe(size)

      await gridfs.delete(fileId)
    })

    it('應該正確報告上傳進度', async () => {
      const size = 500 * 1024 // 500KB
      const content = new Uint8Array(size).fill(66) // 填充 'B'
      const blob = new Blob([content])

      const progressUpdates: GridFSUploadProgress[] = []
      await gridfs.uploadLargeFile(
        blob,
        { filename: 'progress-test.bin', chunkSizeBytes: 100 * 1024 },
        (progress) => {
          progressUpdates.push({ ...progress })
        }
      )

      // 應該有多個進度更新
      expect(progressUpdates.length).toBeGreaterThan(1)

      // 檢查進度是否遞增
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].bytesWritten).toBeGreaterThanOrEqual(
          progressUpdates[i - 1].bytesWritten
        )
      }

      // 最後一個進度應該是 100%
      const lastProgress = progressUpdates[progressUpdates.length - 1]
      expect(lastProgress.percentage).toBe(100)
      expect(lastProgress.bytesWritten).toBe(size)
    })
  })

  describe('檔案中繼資料', () => {
    it('應該能取得檔案中繼資料', async () => {
      const content = Buffer.from('Metadata test')
      const fileId = await gridfs.upload(content, {
        filename: 'meta-query-test.txt',
        metadata: { author: 'Test User', version: 2 },
        contentType: 'text/plain',
      })

      const fileInfo = await gridfs.findById(fileId)
      expect(fileInfo).not.toBeNull()
      expect(fileInfo?.filename).toBe('meta-query-test.txt')
      expect(fileInfo?.contentType).toBe('text/plain')
      expect(fileInfo?.metadata?.author).toBe('Test User')
      expect(fileInfo?.metadata?.version).toBe(2)
      expect(fileInfo?.length).toBe(content.length)

      await gridfs.delete(fileId)
    })

    it('找不到檔案時應該返回 null', async () => {
      const fileInfo = await gridfs.findById('507f1f77bcf86cd799439011')
      expect(fileInfo).toBeNull()
    })
  })

  describe('列表與查詢', () => {
    it('應該列出所有檔案', async () => {
      const file1 = await gridfs.upload(Buffer.from('File 1'), { filename: 'file1.txt' })
      const file2 = await gridfs.upload(Buffer.from('File 2'), { filename: 'file2.txt' })

      const files = await gridfs.list()
      expect(files.length).toBeGreaterThanOrEqual(2)

      await gridfs.delete(file1)
      await gridfs.delete(file2)
    })

    it('應該支援過濾查詢', async () => {
      const pdfId = await gridfs.upload(Buffer.from('PDF content'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      })

      const txtId = await gridfs.upload(Buffer.from('Text content'), {
        filename: 'doc.txt',
        contentType: 'text/plain',
      })

      const pdfs = await gridfs.list({ contentType: 'application/pdf' })
      expect(pdfs.length).toBeGreaterThanOrEqual(1)
      expect(pdfs.some((f) => f._id === pdfId)).toBe(true)

      await gridfs.delete(pdfId)
      await gridfs.delete(txtId)
    })
  })
})

// 匯出進度型別供測試使用
type GridFSUploadProgress = {
  bytesWritten: number
  totalBytes: number
  percentage: number
}

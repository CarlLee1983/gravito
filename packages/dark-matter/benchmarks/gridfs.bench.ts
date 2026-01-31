/**
 * GridFS Performance Benchmark
 *
 * 測試 GridFS 在不同檔案大小和操作模式下的效能
 */

import { afterAll, beforeAll, bench, describe } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'

// 只在有 MongoDB 時執行
const describeBench = process.env.MONGODB_URI ? describe : describe.skip

// 生成測試資料
function generateTestData(sizeInBytes: number): Uint8Array {
  return new Uint8Array(sizeInBytes)
}

describeBench('GridFS Performance', () => {
  let gridfs: ReturnType<typeof Mongo.gridfs>

  beforeAll(async () => {
    Mongo.configure({
      default: 'bench',
      connections: {
        bench: { uri: MONGODB_URI, database: 'gridfs_benchmark' },
      },
    })
    await Mongo.connect()
    gridfs = Mongo.gridfs()
  })

  afterAll(async () => {
    // 清理測試檔案
    const files = await gridfs.find()
    for (const file of files) {
      await gridfs.delete(file._id)
    }
    await Mongo.disconnect()
  })

  describe('上傳效能測試', () => {
    bench('上傳 10KB 檔案', async () => {
      const data = generateTestData(10 * 1024)
      const id = await gridfs.uploadFromBuffer(data, 'test-10kb.bin')
      await gridfs.delete(id)
    })

    bench('上傳 100KB 檔案', async () => {
      const data = generateTestData(100 * 1024)
      const id = await gridfs.uploadFromBuffer(data, 'test-100kb.bin')
      await gridfs.delete(id)
    })

    bench('上傳 1MB 檔案', async () => {
      const data = generateTestData(1 * 1024 * 1024)
      const id = await gridfs.uploadFromBuffer(data, 'test-1mb.bin')
      await gridfs.delete(id)
    })

    bench('上傳 10MB 檔案', async () => {
      const data = generateTestData(10 * 1024 * 1024)
      const id = await gridfs.uploadFromBuffer(data, 'test-10mb.bin')
      await gridfs.delete(id)
    })

    bench('批次上傳 10 個 100KB 檔案', async () => {
      const data = generateTestData(100 * 1024)
      const ids = []

      for (let i = 0; i < 10; i++) {
        const id = await gridfs.uploadFromBuffer(data, `batch-${i}.bin`)
        ids.push(id)
      }

      for (const id of ids) {
        await gridfs.delete(id)
      }
    })
  })

  describe('下載效能測試', () => {
    let smallFileId: any
    let mediumFileId: any
    let largeFileId: any

    beforeAll(async () => {
      // 預先上傳測試檔案
      smallFileId = await gridfs.uploadFromBuffer(generateTestData(10 * 1024), 'small.bin')
      mediumFileId = await gridfs.uploadFromBuffer(generateTestData(1 * 1024 * 1024), 'medium.bin')
      largeFileId = await gridfs.uploadFromBuffer(generateTestData(10 * 1024 * 1024), 'large.bin')
    })

    afterAll(async () => {
      await gridfs.delete(smallFileId)
      await gridfs.delete(mediumFileId)
      await gridfs.delete(largeFileId)
    })

    bench('下載 10KB 檔案', async () => {
      await gridfs.downloadAsBuffer(smallFileId)
    })

    bench('下載 1MB 檔案', async () => {
      await gridfs.downloadAsBuffer(mediumFileId)
    })

    bench('下載 10MB 檔案', async () => {
      await gridfs.downloadAsBuffer(largeFileId)
    })

    bench('並發下載 10 個小檔案', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(gridfs.downloadAsBuffer(smallFileId))
      }
      await Promise.all(promises)
    })
  })

  describe('串流效能測試', () => {
    bench('串流上傳 1MB 檔案', async () => {
      const data = generateTestData(1 * 1024 * 1024)
      const stream = gridfs.openUploadStream('stream-upload.bin')

      await new Promise<void>((resolve, reject) => {
        stream.write(data, (err) => {
          if (err) reject(err)
        })
        stream.end(() => resolve())
      })

      await gridfs.delete(stream.id)
    })

    bench('串流下載 1MB 檔案', async () => {
      const data = generateTestData(1 * 1024 * 1024)
      const id = await gridfs.uploadFromBuffer(data, 'stream-download.bin')

      const stream = gridfs.openDownloadStream(id)

      await new Promise<void>((resolve, reject) => {
        const chunks: Uint8Array[] = []
        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('end', () => resolve())
        stream.on('error', reject)
      })

      await gridfs.delete(id)
    })
  })

  describe('查詢效能測試', () => {
    beforeAll(async () => {
      // 上傳多個測試檔案
      for (let i = 0; i < 50; i++) {
        await gridfs.uploadFromBuffer(generateTestData(10 * 1024), `query-test-${i}.bin`, {
          metadata: { category: i % 2 === 0 ? 'even' : 'odd', index: i },
        })
      }
    })

    afterAll(async () => {
      const files = await gridfs.find()
      for (const file of files) {
        if (file.filename?.startsWith('query-test-')) {
          await gridfs.delete(file._id)
        }
      }
    })

    bench('查詢所有檔案', async () => {
      await gridfs.find()
    })

    bench('依檔名查詢', async () => {
      await gridfs.findByFilename('query-test-25.bin')
    })

    bench('查詢前 10 個檔案', async () => {
      const files = await gridfs.find()
      files.slice(0, 10)
    })
  })

  describe('刪除效能測試', () => {
    bench('單一檔案刪除', async () => {
      const data = generateTestData(10 * 1024)
      const id = await gridfs.uploadFromBuffer(data, 'delete-test.bin')
      await gridfs.delete(id)
    })

    bench('批次刪除 10 個檔案', async () => {
      const ids = []

      for (let i = 0; i < 10; i++) {
        const id = await gridfs.uploadFromBuffer(generateTestData(10 * 1024), `batch-del-${i}.bin`)
        ids.push(id)
      }

      for (const id of ids) {
        await gridfs.delete(id)
      }
    })
  })

  describe('記憶體使用測試', () => {
    bench('上傳大檔案（50MB）記憶體峰值', async () => {
      const data = generateTestData(50 * 1024 * 1024)
      const id = await gridfs.uploadFromBuffer(data, 'large-memory.bin')
      await gridfs.delete(id)
    })

    bench('並發上傳 5 個 5MB 檔案', async () => {
      const data = generateTestData(5 * 1024 * 1024)
      const promises = []

      for (let i = 0; i < 5; i++) {
        promises.push(gridfs.uploadFromBuffer(data, `concurrent-${i}.bin`))
      }

      const ids = await Promise.all(promises)

      for (const id of ids) {
        await gridfs.delete(id)
      }
    })
  })
})

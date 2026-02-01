/**
 * S3Store 整合測試
 *
 * 使用本地 MinIO 進行測試
 *
 * 啟動 MinIO:
 * docker run -d --name nebula-minio-test -p 9000:9000 -p 9001:9001 \
 *   -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=minioadmin" \
 *   minio/minio server /data --console-address ":9001"
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { S3Store } from '../src/S3Store'

const TEST_BUCKET = 'nebula-test-bucket'
const MINIO_CONFIG = {
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
}

let s3Client: S3Client
let store: S3Store

beforeAll(async () => {
  // 建立 S3 Client
  s3Client = new S3Client(MINIO_CONFIG)

  // 建立測試 bucket
  try {
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: TEST_BUCKET,
      })
    )
    console.log(`✅ Created test bucket: ${TEST_BUCKET}`)
  } catch (error: any) {
    if (error.name !== 'BucketAlreadyOwnedByYou') {
      throw error
    }
    console.log(`ℹ️ Test bucket already exists: ${TEST_BUCKET}`)
  }

  // 建立 S3Store
  store = new S3Store({
    bucket: TEST_BUCKET,
    ...MINIO_CONFIG,
  })
})

afterAll(async () => {
  // 清理所有測試檔案
  try {
    const result = await store.listPaginated('', { maxResults: 1000 })
    for (const item of result.items) {
      await store.delete(item.key)
    }
    console.log(`🧹 Cleaned up ${result.count} test files`)
  } catch (error) {
    console.error('❌ Cleanup error:', error)
  }
})

describe('S3Store - MinIO 整合測試', () => {
  it('應該能夠上傳和下載文字檔案', async () => {
    const testKey = `test-text-${Date.now()}.txt`
    const testContent = 'Hello, MinIO Integration Test! 你好，世界！'

    // 上傳
    await store.put(testKey, testContent)
    console.log(`✅ Uploaded: ${testKey}`)

    // 下載
    const blob = await store.get(testKey)
    expect(blob).not.toBeNull()

    const downloadedContent = await blob!.text()
    expect(downloadedContent).toBe(testContent)
    console.log(`✅ Downloaded and verified: ${testKey}`)

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠上傳和下載二進位檔案', async () => {
    const testKey = `test-binary-${Date.now()}.bin`
    const binaryData = new Uint8Array([0, 1, 2, 3, 255, 254, 253, 252])

    // 上傳
    await store.put(testKey, Buffer.from(binaryData))
    console.log(`✅ Uploaded binary: ${testKey}`)

    // 下載
    const blob = await store.get(testKey)
    expect(blob).not.toBeNull()

    const downloadedData = new Uint8Array(await blob!.arrayBuffer())
    expect(downloadedData).toEqual(binaryData)
    console.log(`✅ Downloaded and verified binary: ${testKey}`)

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠檢查檔案存在', async () => {
    const testKey = `test-exists-${Date.now()}.txt`

    // 不存在
    expect(await store.exists(testKey)).toBe(false)

    // 上傳
    await store.put(testKey, 'test')

    // 存在
    expect(await store.exists(testKey)).toBe(true)
    console.log(`✅ File exists check: ${testKey}`)

    // 清理
    await store.delete(testKey)

    // 不存在
    expect(await store.exists(testKey)).toBe(false)
  })

  it('應該能夠刪除檔案', async () => {
    const testKey = `test-delete-${Date.now()}.txt`

    // 上傳
    await store.put(testKey, 'delete me')

    // 刪除
    const deleted = await store.delete(testKey)
    expect(deleted).toBe(true)
    console.log(`✅ Deleted: ${testKey}`)

    // 驗證不存在
    expect(await store.exists(testKey)).toBe(false)

    // 再次刪除應該回傳 false
    const deletedAgain = await store.delete(testKey)
    expect(deletedAgain).toBe(false)
  })

  it('應該能夠複製檔案', async () => {
    const sourceKey = `test-copy-source-${Date.now()}.txt`
    const destKey = `test-copy-dest-${Date.now()}.txt`
    const content = 'Copy me!'

    // 上傳來源檔案
    await store.put(sourceKey, content)

    // 複製
    await store.copy(sourceKey, destKey)
    console.log(`✅ Copied: ${sourceKey} → ${destKey}`)

    // 驗證兩個檔案都存在
    expect(await store.exists(sourceKey)).toBe(true)
    expect(await store.exists(destKey)).toBe(true)

    // 驗證內容相同
    const destBlob = await store.get(destKey)
    expect(await destBlob!.text()).toBe(content)

    // 清理
    await store.delete(sourceKey)
    await store.delete(destKey)
  })

  it('應該能夠移動檔案', async () => {
    const sourceKey = `test-move-source-${Date.now()}.txt`
    const destKey = `test-move-dest-${Date.now()}.txt`
    const content = 'Move me!'

    // 上傳來源檔案
    await store.put(sourceKey, content)

    // 移動
    await store.move(sourceKey, destKey)
    console.log(`✅ Moved: ${sourceKey} → ${destKey}`)

    // 驗證來源不存在，目標存在
    expect(await store.exists(sourceKey)).toBe(false)
    expect(await store.exists(destKey)).toBe(true)

    // 驗證內容
    const destBlob = await store.get(destKey)
    expect(await destBlob!.text()).toBe(content)

    // 清理
    await store.delete(destKey)
  })

  it('應該能夠設定和讀取 metadata', async () => {
    const testKey = `test-metadata-${Date.now()}.txt`

    // 上傳時設定 metadata
    await store.put(testKey, 'test content', {
      contentType: 'text/plain; charset=utf-8',
      metadata: {
        author: 'Integration Test',
        version: '1.0',
        description: '測試中文 metadata',
      },
      cacheControl: 'public, max-age=3600',
    })
    console.log(`✅ Uploaded with metadata: ${testKey}`)

    // 讀取 metadata
    const meta = await store.getMetadata(testKey)
    expect(meta).not.toBeNull()
    expect(meta!.mimeType).toBe('text/plain; charset=utf-8')
    expect(meta!.customMetadata?.author).toBe('Integration Test')
    expect(meta!.customMetadata?.version).toBe('1.0')
    expect(meta!.customMetadata?.description).toBe('測試中文 metadata')
    console.log(`✅ Verified metadata:`, meta!.customMetadata)

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠更新 metadata', async () => {
    const testKey = `test-update-metadata-${Date.now()}.txt`

    // 上傳檔案
    await store.put(testKey, 'test content', {
      metadata: {
        version: '1.0',
        author: 'Original Author',
      },
    })

    // 更新 metadata (注意：S3 metadata 鍵會被轉換為小寫)
    await store.setMetadata(testKey, {
      version: '2.0',
      updatedat: new Date().toISOString(), // 使用小寫
    })
    console.log(`✅ Updated metadata: ${testKey}`)

    // 驗證 metadata
    const meta = await store.getMetadata(testKey)
    expect(meta!.customMetadata?.version).toBe('2.0')
    expect(meta!.customMetadata?.author).toBe('Original Author') // 保留原有
    expect(meta!.customMetadata?.updatedat).toBeDefined() // 使用小寫
    console.log(`✅ Verified updated metadata:`, meta!.customMetadata)

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠使用串流上傳大檔案', async () => {
    const testKey = `test-stream-${Date.now()}.bin`
    const sizeInMB = 5

    // 建立 5MB 的測試資料串流
    const stream = new ReadableStream({
      start(controller) {
        const chunkSize = 1024 * 1024 // 1MB
        for (let i = 0; i < sizeInMB; i++) {
          const chunk = new Uint8Array(chunkSize).fill(65 + i) // A, B, C...
          controller.enqueue(chunk)
        }
        controller.close()
      },
    })

    // 串流上傳
    const startTime = performance.now()
    await store.putStream(testKey, stream)
    const uploadTime = performance.now() - startTime
    console.log(`✅ Stream uploaded ${sizeInMB}MB in ${uploadTime.toFixed(2)}ms`)

    // 驗證檔案大小
    const meta = await store.getMetadata(testKey)
    expect(meta!.size).toBe(sizeInMB * 1024 * 1024)

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠使用串流下載檔案', async () => {
    const testKey = `test-stream-download-${Date.now()}.txt`
    const testContent = 'Stream download test content 串流下載測試'

    // 上傳檔案
    await store.put(testKey, testContent)

    // 串流下載
    const stream = await store.getStream(testKey)
    expect(stream).not.toBeNull()

    // 讀取串流
    const reader = stream!.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const decoder = new TextDecoder()
    const downloadedContent = decoder.decode(Buffer.concat(chunks))
    expect(downloadedContent).toBe(testContent)
    console.log(`✅ Stream downloaded and verified: ${testKey}`)

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠分頁列舉檔案', async () => {
    const prefix = `test-list-${Date.now()}/`
    const fileCount = 15

    // 上傳多個檔案
    for (let i = 0; i < fileCount; i++) {
      await store.put(`${prefix}file${i.toString().padStart(3, '0')}.txt`, `content ${i}`)
    }
    console.log(`✅ Uploaded ${fileCount} files`)

    // 第一頁（10 個）
    const page1 = await store.listPaginated(prefix, { maxResults: 10 })
    expect(page1.count).toBe(10)
    expect(page1.hasMore).toBe(true)
    expect(page1.nextCursor).not.toBeNull()
    console.log(`✅ Page 1: ${page1.count} files, hasMore: ${page1.hasMore}`)

    // 第二頁（剩餘 5 個）
    const page2 = await store.listPaginated(prefix, {
      maxResults: 10,
      cursor: page1.nextCursor!,
    })
    expect(page2.count).toBe(5)
    expect(page2.hasMore).toBe(false)
    expect(page2.nextCursor).toBeNull()
    console.log(`✅ Page 2: ${page2.count} files, hasMore: ${page2.hasMore}`)

    // 清理
    for (let i = 0; i < fileCount; i++) {
      await store.delete(`${prefix}file${i.toString().padStart(3, '0')}.txt`)
    }
  })

  it('應該能夠產生 Presigned URL', async () => {
    const testKey = `test-presigned-${Date.now()}.txt`
    const testContent = 'Presigned URL test'

    // 上傳檔案
    await store.put(testKey, testContent)

    // 產生 Presigned URL (1 小時有效)
    const url = await store.getSignedUrl(testKey, 3600)
    expect(url).toContain('X-Amz-Algorithm')
    expect(url).toContain('X-Amz-Credential')
    expect(url).toContain('X-Amz-Signature')
    expect(url).toContain(testKey)
    console.log(`✅ Presigned URL generated:`, url.substring(0, 100) + '...')

    // 使用 Presigned URL 下載
    const response = await fetch(url)
    expect(response.ok).toBe(true)

    const downloadedContent = await response.text()
    expect(downloadedContent).toBe(testContent)
    console.log(`✅ Downloaded via Presigned URL successfully`)

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠處理中文檔名和內容', async () => {
    const testKey = `測試/中文檔名-${Date.now()}.txt`
    const testContent = '這是中文內容測試 🚀\n包含多行\n和 emoji'

    // 上傳
    await store.put(testKey, testContent)
    console.log(`✅ Uploaded Chinese filename: ${testKey}`)

    // 下載
    const blob = await store.get(testKey)
    expect(blob).not.toBeNull()

    const downloadedContent = await blob!.text()
    expect(downloadedContent).toBe(testContent)
    console.log(`✅ Downloaded and verified Chinese content`)

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠處理大量檔案列舉', async () => {
    const prefix = `test-bulk-${Date.now()}/`
    const fileCount = 100

    // 上傳 100 個檔案
    console.log(`⏳ Uploading ${fileCount} files...`)
    const uploadStart = performance.now()

    for (let i = 0; i < fileCount; i++) {
      await store.put(`${prefix}file${i.toString().padStart(4, '0')}.txt`, `content ${i}`)
    }

    const uploadTime = performance.now() - uploadStart
    console.log(`✅ Uploaded ${fileCount} files in ${uploadTime.toFixed(2)}ms`)

    // 列舉所有檔案
    const listStart = performance.now()
    const result = await store.listPaginated(prefix, { maxResults: 1000 })
    const listTime = performance.now() - listStart

    expect(result.count).toBe(fileCount)
    expect(result.hasMore).toBe(false)
    console.log(`✅ Listed ${result.count} files in ${listTime.toFixed(2)}ms`)

    // 清理
    console.log(`⏳ Cleaning up ${fileCount} files...`)
    for (let i = 0; i < fileCount; i++) {
      await store.delete(`${prefix}file${i.toString().padStart(4, '0')}.txt`)
    }
    console.log(`✅ Cleaned up successfully`)
  })
})

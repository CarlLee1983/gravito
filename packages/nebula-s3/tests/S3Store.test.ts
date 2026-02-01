import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { S3Store } from '../src/S3Store'

/**
 * S3Store 單元測試
 *
 * 注意：這些測試使用 mock，不會實際連接 S3
 * 若要進行整合測試，請設定真實的 S3 憑證
 */

describe('S3Store - 基本功能', () => {
  it('應該能夠建立 S3Store 實例', () => {
    const store = new S3Store({
      bucket: 'test-bucket',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      },
    })

    expect(store).toBeDefined()
  })

  it('應該支援自定義 endpoint (Cloudflare R2, MinIO)', () => {
    const store = new S3Store({
      bucket: 'test-bucket',
      endpoint: 'https://my-endpoint.com',
      region: 'auto',
      forcePathStyle: true,
    })

    expect(store).toBeDefined()
  })

  it('getUrl 應該產生正確的公開 URL', () => {
    const store = new S3Store({
      bucket: 'my-bucket',
      region: 'us-east-1',
    })

    const url = store.getUrl('path/to/file.jpg')
    expect(url).toBe('https://my-bucket.s3.us-east-1.amazonaws.com/path/to/file.jpg')
  })

  it('getUrl 應該使用自定義的 publicUrl (CDN)', () => {
    const store = new S3Store({
      bucket: 'my-bucket',
      region: 'us-east-1',
      publicUrl: 'https://cdn.example.com',
    })

    const url = store.getUrl('image.jpg')
    expect(url).toBe('https://cdn.example.com/image.jpg')
  })
})

describe('S3Store - 型別檢查', () => {
  it('應該實作 StorageStore 介面的所有必要方法', () => {
    const store = new S3Store({
      bucket: 'test-bucket',
      region: 'us-east-1',
    })

    // 檢查所有必要方法是否存在
    expect(typeof store.put).toBe('function')
    expect(typeof store.get).toBe('function')
    expect(typeof store.delete).toBe('function')
    expect(typeof store.exists).toBe('function')
    expect(typeof store.copy).toBe('function')
    expect(typeof store.move).toBe('function')
    expect(typeof store.getMetadata).toBe('function')
    expect(typeof store.getUrl).toBe('function')
  })

  it('應該實作所有可選方法', () => {
    const store = new S3Store({
      bucket: 'test-bucket',
      region: 'us-east-1',
    })

    // 檢查可選方法
    expect(typeof store.getSignedUrl).toBe('function')
    expect(typeof store.putStream).toBe('function')
    expect(typeof store.getStream).toBe('function')
    expect(typeof store.listPaginated).toBe('function')
    expect(typeof store.setMetadata).toBe('function')
  })
})

describe('S3Store - 配置選項', () => {
  it('應該接受完整的配置選項', () => {
    const store = new S3Store({
      bucket: 'my-bucket',
      region: 'ap-northeast-1',
      endpoint: 'https://custom-endpoint.com',
      credentials: {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      },
      publicUrl: 'https://cdn.example.com',
      forcePathStyle: true,
    })

    expect(store).toBeDefined()
  })

  it('應該接受最小配置選項', () => {
    const store = new S3Store({
      bucket: 'my-bucket',
    })

    expect(store).toBeDefined()
  })
})

/**
 * 注意：以下測試需要實際的 S3 憑證才能執行
 * 可以使用 MinIO 本地測試，或設定環境變數：
 *
 * export AWS_ACCESS_KEY_ID=your-key
 * export AWS_SECRET_ACCESS_KEY=your-secret
 * export S3_TEST_BUCKET=your-test-bucket
 * export S3_TEST_REGION=us-east-1
 */

const shouldRunIntegrationTests = !!process.env.S3_TEST_BUCKET

describe.skipIf(!shouldRunIntegrationTests)('S3Store - 整合測試', () => {
  let store: S3Store

  beforeEach(() => {
    store = new S3Store({
      bucket: process.env.S3_TEST_BUCKET!,
      region: process.env.S3_TEST_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  })

  it('應該能夠上傳和下載檔案', async () => {
    const testKey = `test-${Date.now()}.txt`
    const testContent = 'Hello, S3 Integration Test!'

    // 上傳
    await store.put(testKey, testContent)

    // 下載
    const blob = await store.get(testKey)
    expect(blob).not.toBeNull()
    expect(await blob!.text()).toBe(testContent)

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

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠使用 metadata', async () => {
    const testKey = `test-metadata-${Date.now()}.txt`

    // 上傳時設定 metadata
    await store.put(testKey, 'test content', {
      contentType: 'text/plain',
      metadata: {
        author: 'Test User',
        version: '1.0',
      },
    })

    // 讀取 metadata
    const meta = await store.getMetadata(testKey)
    expect(meta).not.toBeNull()
    expect(meta!.customMetadata?.author).toBe('Test User')
    expect(meta!.customMetadata?.version).toBe('1.0')

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠產生 Presigned URL', async () => {
    const testKey = `test-presigned-${Date.now()}.txt`

    // 上傳檔案
    await store.put(testKey, 'test content')

    // 產生 Presigned URL
    const url = await store.getSignedUrl(testKey, 3600)
    expect(url).toContain('X-Amz-Algorithm')
    expect(url).toContain('X-Amz-Credential')
    expect(url).toContain('X-Amz-Signature')

    // 清理
    await store.delete(testKey)
  })

  it('應該能夠分頁列舉檔案', async () => {
    const prefix = `test-list-${Date.now()}/`

    // 上傳多個檔案
    for (let i = 0; i < 5; i++) {
      await store.put(`${prefix}file${i}.txt`, `content ${i}`)
    }

    // 列舉檔案
    const result = await store.listPaginated(prefix, { maxResults: 10 })

    expect(result.count).toBe(5)
    expect(result.items.length).toBe(5)
    expect(result.hasMore).toBe(false)

    // 清理
    for (let i = 0; i < 5; i++) {
      await store.delete(`${prefix}file${i}.txt`)
    }
  })
})

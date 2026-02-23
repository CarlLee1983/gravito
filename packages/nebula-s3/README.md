# @gravito/nebula-s3

S3 儲存驅動，適用於 `@gravito/nebula`。

支援 AWS S3、Cloudflare R2、MinIO 等 S3 相容服務。

## 安裝

```bash
bun add @gravito/nebula-s3
```

## 功能特點

- ✅ **完整的 StorageStore 實作**
- ✅ **Stream 支援** - putStream/getStream
- ✅ **分頁列舉** - listPaginated
- ✅ **Metadata 支援** - customMetadata, setMetadata
- ✅ **Presigned URL** - getSignedUrl
- ✅ **多服務支援** - AWS S3, Cloudflare R2, MinIO

## 快速開始

### AWS S3

```typescript
import { S3Store } from '@gravito/nebula-s3'
import { StorageManager } from '@gravito/nebula'

const s3Store = new S3Store({
  bucket: 'my-bucket',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const storage = new StorageManager(
  (name) => s3Store,
  { default: 's3' }
)

// 使用
await storage.put('file.txt', 'Hello, S3!')
const data = await storage.get('file.txt')
```

### Cloudflare R2

```typescript
const r2Store = new S3Store({
  bucket: 'my-bucket',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
```

### MinIO

```typescript
const minioStore = new S3Store({
  bucket: 'my-bucket',
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  forcePathStyle: true, // MinIO 需要
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
})
```

## API

### 基本操作

```typescript
// 上傳檔案
await s3Store.put('file.txt', 'content')

// 下載檔案
const data = await s3Store.get('file.txt')

// 刪除檔案
await s3Store.delete('file.txt')

// 檢查存在
const exists = await s3Store.exists('file.txt')

// 複製檔案
await s3Store.copy('source.txt', 'dest.txt')

// 移動檔案
await s3Store.move('old.txt', 'new.txt')
```

### 串流操作

```typescript
// 串流上傳（適合大檔案）
const fileStream = Bun.file('large-video.mp4').stream()
await s3Store.putStream('videos/upload.mp4', fileStream)

// 串流下載
const downloadStream = await s3Store.getStream('videos/upload.mp4')
if (downloadStream) {
  const file = Bun.file('downloaded.mp4')
  const writer = file.writer()
  const reader = downloadStream.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    writer.write(value)
  }

  await writer.end()
}
```

### Metadata 操作

```typescript
// 上傳時設定 metadata
await s3Store.put('image.jpg', imageData, {
  contentType: 'image/jpeg',
  metadata: {
    author: 'John Doe',
    tags: 'nature,sunset',
  },
  cacheControl: 'public, max-age=31536000',
})

// 讀取 metadata（標準字段）
const meta = await s3Store.getMetadata('image.jpg')
console.log(meta.size)        // 檔案大小
console.log(meta.mimeType)    // image/jpeg
console.log(meta.lastModified) // 最後修改時間

// 注意：customMetadata 會返回 undefined（見下方限制）

// 更新 metadata
await s3Store.setMetadata('image.jpg', {
  tags: 'nature,sunset,photography',
})
```

#### ⚠️ 已知限制

**Custom Metadata 讀取限制**：由於 Bun 原生 S3 API 的限制，`getMetadata()` 的 `customMetadata` 欄位會返回 `undefined`。

- ✅ **寫入自定義 metadata**：通過 `put()` 的 `metadata` 選項完全支援
- ❌ **讀取自定義 metadata**：不支援。`getMetadata()` 只返回標準字段（size、mimeType、lastModified、etag）

**解決方案**：
1. 若需要儲存檔案相關的自定義資訊，考慮使用應用層資料庫（Redis、PostgreSQL 等）
2. 可將 metadata 編碼到物件的 key 名稱中（例如：`uploads/{userId}/{timestamp}-{filename}`）

### 分頁列舉

```typescript
// 列舉檔案（分頁）
const page1 = await s3Store.listPaginated('uploads/', {
  maxResults: 100,
})

console.log(`Found ${page1.count} files`)

// 繼續獲取下一頁
if (page1.hasMore) {
  const page2 = await s3Store.listPaginated('uploads/', {
    maxResults: 100,
    cursor: page1.nextCursor!,
  })
}

// 完整分頁迭代
let cursor: string | null = null
do {
  const result = await s3Store.listPaginated('uploads/', {
    maxResults: 1000,
    cursor: cursor ?? undefined,
  })

  for (const item of result.items) {
    console.log(`File: ${item.key}, Size: ${item.size}`)
  }

  cursor = result.nextCursor
} while (cursor !== null)
```

### Presigned URL

```typescript
// 產生 24 小時有效的下載連結
const url = await s3Store.getSignedUrl('private-file.pdf', 86400)
console.log(url)
// https://my-bucket.s3.us-east-1.amazonaws.com/private-file.pdf?X-Amz-Algorithm=...
```

### CDN 整合

```typescript
const s3Store = new S3Store({
  bucket: 'my-bucket',
  region: 'us-east-1',
  publicUrl: 'https://cdn.example.com', // CDN URL
  credentials: { ... },
})

// 產生 CDN URL
const url = s3Store.getUrl('image.jpg')
// https://cdn.example.com/image.jpg
```

## 配置選項

```typescript
interface S3StoreOptions {
  /** S3 Bucket 名稱 */
  bucket: string

  /** AWS Region (預設: 'auto') */
  region?: string

  /** 自定義 Endpoint (用於 MinIO, Cloudflare R2 等) */
  endpoint?: string

  /** AWS 憑證 */
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }

  /** 公開 URL 前綴 (用於 CDN) */
  publicUrl?: string

  /** 是否強制使用 path-style URL (MinIO 需要) */
  forcePathStyle?: boolean
}
```

## 效能優化建議

### 大檔案上傳

對於大型檔案（>100MB），建議使用 `putStream` 而非 `put`：

```typescript
// ❌ 不佳 - 整個檔案載入記憶體
const file = await Bun.file('large.mp4').arrayBuffer()
await s3Store.put('videos/large.mp4', Buffer.from(file))

// ✅ 良好 - 串流上傳
const stream = Bun.file('large.mp4').stream()
await s3Store.putStream('videos/large.mp4', stream)
```

### 批次操作

列舉大量檔案時，使用 `listPaginated` 並設定合理的 `maxResults`：

```typescript
// ✅ 建議：分頁列舉
const result = await s3Store.listPaginated('uploads/', {
  maxResults: 1000, // 建議 100-1000
})
```

## 實作備註

本套件使用 **Bun 原生 S3 API**（Bun v1.2.3+），無需外部依賴。

- 🚀 **效能優化** - 直接使用 Bun 原生 API，無序列化開銷
- 📦 **輕量級** - 無額外依賴（移除 AWS SDK）
- 🔄 **自動 Multipart** - 大檔案自動分段上傳

## 相容性

- **AWS S3** - ✅ 完整支援
- **Cloudflare R2** - ✅ 完整支援
- **MinIO** - ✅ 完整支援（需設定 `forcePathStyle: true`）
- **其他 S3 相容服務** - ✅ 應該可正常運作

## 授權

MIT

## 相關連結

- [@gravito/nebula](https://github.com/gravito/core/tree/main/packages/nebula) - 核心儲存抽象層
- [Bun S3 Client 文檔](https://bun.sh/docs/api/s3)

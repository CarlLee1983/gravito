# GridFS 進階用法

## HTTP 整合（Express 範例）

```typescript
import express from 'express'
import { Mongo } from '@gravito/dark-matter'

const app = express()

// 檔案上傳 API
app.post('/api/upload', express.raw({ limit: '100mb' }), async (req, res) => {
  const gridfs = Mongo.gridfs()
  const fileId = await gridfs.uploadFromBuffer(
    req.body,
    req.headers['x-filename'] as string,
    { metadata: { uploadedBy: req.headers['user-id'] } }
  )
  res.json({ fileId })
})

// 檔案下載 API
app.get('/api/files/:id', async (req, res) => {
  const gridfs = Mongo.gridfs()
  const buffer = await gridfs.downloadAsBuffer(req.params.id)
  res.send(buffer)
})
```

## 大檔案處理

### 串流上傳（記憶體友善）

```typescript
import fs from 'fs'

const gridfs = Mongo.gridfs()
const stream = gridfs.openUploadStream('large-file.zip')

fs.createReadStream('/path/to/large-file.zip').pipe(stream)

stream.on('finish', () => {
  console.log('上傳完成：', stream.id)
})
```

### 分片上傳（斷點續傳）

```typescript
const chunkSize = 5 * 1024 * 1024 // 5MB
const totalChunks = Math.ceil(fileSize / chunkSize)

for (let i = 0; i < totalChunks; i++) {
  const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize)
  await uploadChunk(chunk, i, totalChunks)
}
```

## 效能優化

- **Chunk 大小：** 預設 255KB，大檔案建議 1-2MB
- **並發控制：** 限制同時上傳數量（建議 3-5 個）
- **CDN 整合：** 將檔案 URL 快取到 CDN

參考：[GridFS 基準測試](../benchmarks/gridfs.bench.ts)

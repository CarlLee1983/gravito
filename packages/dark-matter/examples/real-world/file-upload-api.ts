/**
 * 檔案上傳 API 範例（GridFS + Express）
 */

import { Mongo } from '@gravito/dark-matter'
import express from 'express'

const app = express()

await Mongo.connect()
const gridfs = Mongo.gridfs()

// 檔案上傳
app.post('/upload', express.raw({ limit: '100mb' }), async (req, res) => {
  try {
    const filename = req.headers['x-filename'] as string
    const fileId = await gridfs.uploadFromBuffer(req.body, filename, {
      metadata: { uploadedBy: req.headers['user-id'], uploadedAt: new Date() },
    })
    res.json({ success: true, fileId })
  } catch (_error: any) {
    res.status(500).json({ error: _error.message })
  }
})

// 檔案下載
app.get('/files/:id', async (req, res) => {
  try {
    const buffer = await gridfs.downloadAsBuffer(req.params.id)
    res.send(buffer)
  } catch {
    res.status(404).json({ error: 'File not found' })
  }
})

// 列出檔案
app.get('/files', async (_req, res) => {
  const files = await gridfs.find()
  res.json(files)
})

app.listen(3000, () => console.log('Server running on port 3000'))

/**
 * @fileoverview 圖片上傳處理工作流程
 *
 * 展示檔案驗證、掃描、縮圖產生、上傳流程。
 *
 * @example
 * ```bash
 * bun run examples/image-processing.ts
 * ```
 */

import { createWorkflow, FluxEngine, MemoryStorage } from '../src'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UploadInput {
  fileBuffer: Uint8Array
  fileName: string
  userId: string
}

// ─────────────────────────────────────────────────────────────
// Mock Services
// ─────────────────────────────────────────────────────────────

const detectMimeType = async (buffer: Uint8Array): Promise<string> => {
  // Check magic bytes (simplified)
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  return 'application/octet-stream'
}

const virusScanner = {
  async scan(_buffer: Uint8Array): Promise<{ clean: boolean }> {
    console.log('  🔍 Scanning file for viruses...')
    await new Promise((r) => setTimeout(r, 200))
    return { clean: true }
  },
}

const imageProcessor = {
  async resize(buffer: Uint8Array, width: number, height: number): Promise<Uint8Array> {
    console.log(`  📐 Resizing to ${width}x${height}`)
    // In real app: use sharp or similar
    return buffer.slice(0, Math.min(buffer.length, 1000))
  },
  async compress(buffer: Uint8Array, quality: number): Promise<Uint8Array> {
    console.log(`  🗜️ Compressing with quality ${quality}%`)
    return buffer
  },
}

const s3 = {
  async upload(key: string, _buffer: Uint8Array): Promise<string> {
    console.log(`  ☁️ Uploading to s3://${key}`)
    await new Promise((r) => setTimeout(r, 100))
    return `https://cdn.example.com/${key}`
  },
}

const db = {
  files: {
    async create(data: Record<string, unknown>): Promise<{ id: string }> {
      console.log('  💾 Saving to database:', data)
      return { id: `file-${Date.now()}` }
    },
  },
}

// ─────────────────────────────────────────────────────────────
// Workflow Definition
// ─────────────────────────────────────────────────────────────

const uploadWorkflow = createWorkflow('image-processing')
  .input<UploadInput>()
  .step('validate', async (ctx) => {
    console.log('\n🔍 Step: validate')

    const { fileBuffer, fileName } = ctx.input
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB

    if (fileBuffer.length > MAX_SIZE) {
      throw new Error(`檔案大小超過 10MB (${fileBuffer.length} bytes)`)
    }

    ctx.data.mimeType = await detectMimeType(fileBuffer)
    ctx.data.fileSize = fileBuffer.length

    console.log(`  📄 File: ${fileName}`)
    console.log(`  📏 Size: ${fileBuffer.length} bytes`)
    console.log(`  🏷️ Type: ${ctx.data.mimeType}`)
  })
  .step('scan', async (ctx) => {
    console.log('\n🛡️ Step: scan')

    const scanResult = await virusScanner.scan(ctx.input.fileBuffer)
    if (!scanResult.clean) {
      throw new Error('檔案包含惡意程式')
    }
    ctx.data.scanned = true
  })
  .step('resize', async (ctx) => {
    console.log('\n📐 Step: resize')

    ctx.data.thumbnail = await imageProcessor.resize(ctx.input.fileBuffer, 200, 200)
  })
  .step('compress', async (ctx) => {
    console.log('\n🗜️ Step: compress')

    ctx.data.compressed = await imageProcessor.compress(ctx.input.fileBuffer, 80)
  })
  .commit('upload', async (ctx) => {
    console.log('\n☁️ Step: upload (commit)')

    const baseKey = `${ctx.input.userId}/${ctx.id}/${ctx.input.fileName}`

    ctx.data.urls = {
      original: await s3.upload(baseKey, ctx.data.compressed as Uint8Array),
      thumbnail: await s3.upload(`${baseKey}-thumb`, ctx.data.thumbnail as Uint8Array),
    }
  })
  .commit('save', async (ctx) => {
    console.log('\n💾 Step: save (commit)')

    const urls = ctx.data.urls as { original: string; thumbnail: string }
    ctx.data.record = await db.files.create({
      userId: ctx.input.userId,
      fileName: ctx.input.fileName,
      mimeType: ctx.data.mimeType,
      size: ctx.data.fileSize,
      ...urls,
    })
  })

// ─────────────────────────────────────────────────────────────
// Execute
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('   🖼️ Image Processing Workflow Example')
  console.log('═══════════════════════════════════════════════════════')

  const engine = new FluxEngine({
    storage: new MemoryStorage(),
    on: {
      stepComplete: (step) => console.log(`✓  ${step} completed`),
    },
  })

  // Simulate a JPEG file (magic bytes)
  const fakeImage = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0, // JPEG magic bytes
    ...Array(5000).fill(0), // Mock image data
  ])

  const result = await engine.execute(uploadWorkflow, {
    fileBuffer: fakeImage,
    fileName: 'photo.jpg',
    userId: 'user-12345',
  })

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('   📊 Result')
  console.log('═══════════════════════════════════════════════════════')
  console.log('Status:', result.status)
  console.log('Duration:', result.duration, 'ms')
  console.log('URLs:', (result.data.urls as Record<string, string>) ?? 'N/A')
}

main().catch(console.error)

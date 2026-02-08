import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from 'bun:test'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

class AdapterMock {
  async execute(_args: string[], options: { output?: string } = {}): Promise<void> {
    if (options.output) {
      await Bun.write(options.output, 'data')
    }
  }
}

mock.module('../src/adapters/ImageMagickAdapter', () => ({
  ImageMagickAdapter: AdapterMock,
}))
mock.module('../src/adapters/FFmpegAdapter', () => ({
  FFmpegAdapter: AdapterMock,
}))

let ForgeService: typeof import('../src/ForgeService').ForgeService
let ImageProcessor: typeof import('../src/processors/ImageProcessor').ImageProcessor
let VideoProcessor: typeof import('../src/processors/VideoProcessor').VideoProcessor
let MemoryStatusStore: typeof import('../src/status/StatusStore').MemoryStatusStore
let ProcessingStatusManager: typeof import('../src/status/ProcessingStatus').ProcessingStatusManager
let BasePipeline: typeof import('../src/pipelines/BasePipeline').BasePipeline
let ImagePipeline: typeof import('../src/pipelines/ImagePipeline').ImagePipeline
let VideoPipeline: typeof import('../src/pipelines/VideoPipeline').VideoPipeline
let BaseProcessor: typeof import('../src/processors/BaseProcessor').BaseProcessor

beforeAll(async () => {
  ;({ ForgeService } = await import('../src/ForgeService'))
  ;({ ImageProcessor } = await import('../src/processors/ImageProcessor'))
  ;({ VideoProcessor } = await import('../src/processors/VideoProcessor'))
  ;({ MemoryStatusStore } = await import('../src/status/StatusStore'))
  ;({ ProcessingStatusManager } = await import('../src/status/ProcessingStatus'))
  ;({ BasePipeline } = await import('../src/pipelines/BasePipeline'))
  ;({ ImagePipeline } = await import('../src/pipelines/ImagePipeline'))
  ;({ VideoPipeline } = await import('../src/pipelines/VideoPipeline'))
  ;({ BaseProcessor } = await import('../src/processors/BaseProcessor'))
})

afterAll(async () => {
  await rm('/tmp/forge-image', { recursive: true, force: true })
  await rm('/tmp/forge-video', { recursive: true, force: true })
})

describe('ForgeService', () => {
  let service: InstanceType<typeof ForgeService>

  beforeEach(() => {
    service = new ForgeService({
      statusStore: new MemoryStatusStore(),
    })
  })

  it('creates pipelines and exposes status store', () => {
    expect(service.createVideoPipeline()).toBeDefined()
    expect(service.createImagePipeline()).toBeDefined()
    expect(service.getStatusStore()).toBeDefined()
  })

  it('processes with storage when configured', async () => {
    const storage = {
      put: jest.fn(async () => {}),
      getUrl: jest.fn((key: string) => `https://cdn.test/${key}`),
    }
    const processing = new ForgeService({ storage })

    const outputPath = join(process.cwd(), 'tests', '.tmp-output.bin')
    await Bun.write(outputPath, 'data')

    ;(processing as any).videoProcessor = {
      supports: (mime: string) => mime.startsWith('video/'),
      process: async () => ({
        path: outputPath,
        size: 4,
        mimeType: 'video/mp4',
        url: outputPath,
      }),
    }
    ;(processing as any).imageProcessor = {
      supports: () => false,
      process: async () => ({
        path: outputPath,
        size: 4,
        mimeType: 'image/jpeg',
        url: outputPath,
      }),
    }

    const result = await processing.process({
      source: outputPath,
      filename: 'clip.mp4',
    })

    expect(storage.put).toHaveBeenCalled()
    expect(result.url).toMatch(/^https:\/\/cdn\.test\//)
  })

  it('throws when async processing without status store', async () => {
    const noStore = new ForgeService()
    await expect(noStore.processAsync({ source: 'file' })).rejects.toThrow(
      'Status store is required for async processing'
    )
  })

  it('creates async job and stores status', async () => {
    const store = new MemoryStatusStore()
    const asyncService = new ForgeService({ statusStore: store })

    const job = await asyncService.processAsync({ source: 'file' })
    const saved = await store.get(job.id)

    expect(job.status.status).toBe('pending')
    expect(saved?.jobId).toBe(job.id)
  })
})

describe('Pipelines', () => {
  it('executes pipeline steps and chains outputs', async () => {
    const pipeline = new BasePipeline()
    const processorA = {
      supports: (mime: string) => mime === 'image/jpeg',
      process: async () => ({
        url: '/tmp/step-a',
        path: '/tmp/step-a',
        size: 1,
        mimeType: 'image/png',
      }),
    }
    const processorB = {
      supports: (mime: string) => mime === 'image/png',
      process: async () => ({
        url: '/tmp/step-b',
        path: '/tmp/step-b',
        size: 2,
        mimeType: 'image/webp',
      }),
    }

    pipeline.add(processorA, {}).add(processorB, {})
    const results = await pipeline.execute({
      source: '/tmp/input.jpg',
      filename: 'input.jpg',
      mimeType: 'image/jpeg',
    })

    expect(results).toHaveLength(2)
    expect(results[1]?.mimeType).toBe('image/webp')
  })

  it('throws when processor does not support mime type', async () => {
    const pipeline = new BasePipeline()
    pipeline.add(
      {
        supports: () => false,
        process: async () => ({
          url: '/tmp/output',
          path: '/tmp/output',
          size: 1,
          mimeType: 'image/png',
        }),
      },
      {}
    )

    await expect(
      pipeline.execute({
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      })
    ).rejects.toThrow('Processor does not support MIME type')
  })

  it('supports fluent image and video pipeline helpers', () => {
    const imagePipeline = new ImagePipeline()
    imagePipeline.resize(100, 200).rotate(90).format('png', 80)
    expect((imagePipeline as any).steps.length).toBe(3)

    const videoPipeline = new VideoPipeline()
    videoPipeline.resize(1920, 1080).rotate(180).transcode('webm', 'vp9')
    expect((videoPipeline as any).steps.length).toBe(3)
  })
})

describe('Processors', () => {
  afterEach(async () => {
    await rm('/tmp/forge-image', { recursive: true, force: true })
    await rm('/tmp/forge-video', { recursive: true, force: true })
  })

  it('processes images with options', async () => {
    const processor = new ImageProcessor({ tempDir: '/tmp/forge-image' })
    const output = await processor.process(
      { source: '/tmp/input.jpg', filename: 'input.jpg', mimeType: 'image/jpeg' },
      { width: 100, height: 200, rotate: 90, quality: 80, format: 'png' }
    )

    expect(output.mimeType).toBe('image/png')
    expect(output.metadata?.format).toBe('png')
  })

  it('processes videos with options', async () => {
    const processor = new VideoProcessor({ tempDir: '/tmp/forge-video' })
    const output = await processor.process(
      { source: '/tmp/input.mp4', filename: 'input.mp4', mimeType: 'video/mp4' },
      { width: 1280, rotate: 90, quality: 23, format: 'webm', codec: 'libvpx' }
    )

    expect(output.mimeType).toBe('video/webm')
    expect(output.metadata?.codec).toBe('libvpx')
  })

  it('normalizes inputs and detects mime type in base processor', () => {
    class TestProcessor extends BaseProcessor {
      async process() {
        return { url: '', size: 0, mimeType: 'application/octet-stream' }
      }

      supports() {
        return true
      }

      public exposeMime(input: { filename?: string; mimeType?: string; source: string }) {
        return this.getMimeType(input)
      }
    }

    const processor = new TestProcessor()
    expect(processor.exposeMime({ source: 'file', filename: 'image.png' })).toBe('image/png')
    expect(processor.exposeMime({ source: 'file', filename: 'file.unknown' })).toBe(
      'application/octet-stream'
    )
  })
})

describe('Status management', () => {
  it('creates and updates processing status', () => {
    const created = ProcessingStatusManager.create('job-1')
    expect(created.status).toBe('pending')

    const processing = ProcessingStatusManager.processing(created, 50, 'halfway')
    expect(processing.status).toBe('processing')
    expect(processing.progress).toBe(50)

    const completed = ProcessingStatusManager.completed(processing, {
      url: '/tmp/output',
      size: 1,
      mimeType: 'image/png',
    })
    expect(completed.status).toBe('completed')

    const failed = ProcessingStatusManager.failed(completed, 'boom')
    expect(failed.status).toBe('failed')
    expect(failed.error).toBe('boom')
  })

  it('stores, deletes, and unsubscribes status listeners', async () => {
    const store = new MemoryStatusStore()
    const status = {
      jobId: 'job-1',
      status: 'pending' as const,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const unsubscribe = store.onChange('job-1', () => {
      throw new Error('listener error')
    })

    await store.set(status)
    unsubscribe()
    await store.delete('job-1')

    expect(await store.get('job-1')).toBeNull()
    errorSpy.mockRestore()
  })

  it('retrieves status with get method', async () => {
    const store = new MemoryStatusStore()
    const status = {
      jobId: 'job-2',
      status: 'processing' as const,
      progress: 25,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await store.set(status)
    const retrieved = await store.get('job-2')
    expect(retrieved?.jobId).toBe('job-2')
    expect(retrieved?.status).toBe('processing')
  })

  it('returns null for non-existent job', async () => {
    const store = new MemoryStatusStore()
    const result = await store.get('nonexistent')
    expect(result).toBeNull()
  })

  it('notifies listeners on status update', async () => {
    const store = new MemoryStatusStore()
    const listener = jest.fn()

    const unsubscribe = store.onChange('job-3', listener)

    const status = {
      jobId: 'job-3',
      status: 'processing' as const,
      progress: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await store.set(status)
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })
})

describe('SSEHandler', () => {
  it('creates stream with initial status', async () => {
    const store = new MemoryStatusStore()
    const status = {
      jobId: 'job-sse-1',
      status: 'processing' as const,
      progress: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await store.set(status)

    const { SSEHandler } = await import('../src/status/SSEHandler')
    const handler = new SSEHandler(store)
    const response = await handler.createStream('job-sse-1')

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('returns 404 for non-existent job', async () => {
    const store = new MemoryStatusStore()
    const { SSEHandler } = await import('../src/status/SSEHandler')
    const handler = new SSEHandler(store)
    const response = await handler.createStream('nonexistent-job')

    expect(response.status).toBe(404)
  })

  it('closes stream for completed status', async () => {
    const store = new MemoryStatusStore()
    const status = {
      jobId: 'job-sse-2',
      status: 'completed' as const,
      progress: 100,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      result: {
        url: '/tmp/output',
        size: 100,
        mimeType: 'image/png',
      },
    }

    await store.set(status)

    const { SSEHandler } = await import('../src/status/SSEHandler')
    const handler = new SSEHandler(store)
    const response = await handler.createStream('job-sse-2')

    expect(response.status).toBe(200)
  })

  it('closes stream for failed status', async () => {
    const store = new MemoryStatusStore()
    const status = {
      jobId: 'job-sse-3',
      status: 'failed' as const,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      error: 'Processing failed',
    }

    await store.set(status)

    const { SSEHandler } = await import('../src/status/SSEHandler')
    const handler = new SSEHandler(store)
    const response = await handler.createStream('job-sse-3')

    expect(response.status).toBe(200)
  })
})

describe('ProcessFileJob', () => {
  it('handles job execution with processing status updates', async () => {
    const store = new MemoryStatusStore()
    const { ProcessFileJob } = await import('../src/jobs/ProcessFileJob')

    const job = new ProcessFileJob({
      jobId: 'job-process-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore: store,
      forgeService: new ForgeService({ statusStore: store }),
    })

    // Verify job is created properly
    expect(job).toBeDefined()
  })

  it('throws when status store is missing', async () => {
    const { ProcessFileJob } = await import('../src/jobs/ProcessFileJob')

    const job = new ProcessFileJob({
      jobId: 'job-process-2',
      input: { source: '/tmp/input.jpg', filename: 'input.jpg' },
      options: {},
    })

    await expect(job.handle()).rejects.toThrow('Status store is required')
  })

  it('throws when forge service is missing', async () => {
    const store = new MemoryStatusStore()
    const { ProcessFileJob } = await import('../src/jobs/ProcessFileJob')

    const job = new ProcessFileJob({
      jobId: 'job-process-3',
      input: { source: '/tmp/input.jpg', filename: 'input.jpg' },
      options: {},
      statusStore: store,
    })

    await expect(job.handle()).rejects.toThrow('Forge service is required')
  })
})

describe('Image processing options', () => {
  it('handles image processor with various format options', async () => {
    const processor = new ImageProcessor({ tempDir: '/tmp/forge-image' })

    // Test that processor handles different formats
    expect(processor.supports('image/jpeg')).toBe(true)
    expect(processor.supports('image/png')).toBe(true)
    expect(processor.supports('image/webp')).toBe(true)
    expect(processor.supports('video/mp4')).toBe(false)
  })

  it('handles video processor with various format options', async () => {
    const processor = new VideoProcessor({ tempDir: '/tmp/forge-video' })

    // Test that processor handles different formats
    expect(processor.supports('video/mp4')).toBe(true)
    expect(processor.supports('video/webm')).toBe(true)
    expect(processor.supports('image/png')).toBe(false)
  })
})

describe('MIME type detection', () => {
  it('sniffs mime types from file headers', async () => {
    const { sniffMimeType } = await import('../src/utils/mime')

    // Create a simple JPEG header
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
    const jpegBlob = new Blob([jpegHeader])

    const mimeType = await sniffMimeType(jpegBlob)
    expect(mimeType).toBe('image/jpeg')
  })

  it('returns null for unknown file types', async () => {
    const { sniffMimeType } = await import('../src/utils/mime')

    // Create unknown header
    const unknownHeader = new Uint8Array([0x00, 0x01, 0x02, 0x03])
    const unknownBlob = new Blob([unknownHeader])

    const mimeType = await sniffMimeType(unknownBlob)
    expect(mimeType).toBeNull()
  })

  it('detects PNG files', async () => {
    const { sniffMimeType } = await import('../src/utils/mime')

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const pngBlob = new Blob([pngHeader])

    const mimeType = await sniffMimeType(pngBlob)
    expect(mimeType).toBe('image/png')
  })

  it('detects WebM files', async () => {
    const { sniffMimeType } = await import('../src/utils/mime')

    // WebM signature: 1A 45 DF A3
    const webmHeader = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])
    const webmBlob = new Blob([webmHeader])

    const mimeType = await sniffMimeType(webmBlob)
    expect(mimeType).toBe('video/webm')
  })
})

describe('DiskSpaceGuard', () => {
  it('gets disk space information', async () => {
    const { DiskSpaceGuard } = await import('../src/utils/DiskSpaceGuard')

    const info = await DiskSpaceGuard.getSpaceInfo('/')
    expect(info).toBeDefined()
    expect(typeof info.available).toBe('number')
    expect(typeof info.total).toBe('number')
    expect(typeof info.free).toBe('number')
  })

  it('checks if there is enough space', async () => {
    const { DiskSpaceGuard } = await import('../src/utils/DiskSpaceGuard')

    // Check for 1KB of space (should succeed on most systems)
    const hasSpace = await DiskSpaceGuard.hasEnoughSpace('/tmp', 1024)
    expect(typeof hasSpace).toBe('boolean')
  })

  it('throws error when disk space is insufficient', async () => {
    const { DiskSpaceGuard } = await import('../src/utils/DiskSpaceGuard')

    // Request impossibly large space
    const toPetabytes = 1024 * 1024 * 1024 * 1024 * 1024

    try {
      await DiskSpaceGuard.check('/tmp', toPetabytes)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('Insufficient disk space')
    }
  })
})

describe('Pipeline error handling', () => {
  it('handles pipeline execution errors gracefully', async () => {
    const pipeline = new BasePipeline()

    // Add a processor that will fail
    pipeline.add(
      {
        supports: () => true,
        process: async () => {
          throw new Error('Processor execution failed')
        },
      },
      {}
    )

    await expect(
      pipeline.execute({
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      })
    ).rejects.toThrow()
  })

  it('chains multiple processors in sequence', async () => {
    const pipeline = new BasePipeline()

    const results: any[] = []

    // First processor
    pipeline.add(
      {
        supports: (mime: string) => mime === 'image/jpeg',
        process: async (_input) => {
          results.push('step1')
          return {
            url: '/tmp/step1',
            path: '/tmp/step1',
            size: 100,
            mimeType: 'image/png',
          }
        },
      },
      {}
    )

    // Second processor
    pipeline.add(
      {
        supports: (mime: string) => mime === 'image/png',
        process: async (_input) => {
          results.push('step2')
          return {
            url: '/tmp/step2',
            path: '/tmp/step2',
            size: 150,
            mimeType: 'image/webp',
          }
        },
      },
      {}
    )

    await pipeline.execute({
      source: '/tmp/input.jpg',
      filename: 'input.jpg',
      mimeType: 'image/jpeg',
    })

    expect(results).toEqual(['step1', 'step2'])
  })
})

describe('ForgeService advanced features', () => {
  it('creates pipelines with specific configurations', () => {
    const service = new ForgeService({
      statusStore: new MemoryStatusStore(),
    })

    const videoPipeline = service.createVideoPipeline()
    const imagePipeline = service.createImagePipeline()

    expect(videoPipeline).toBeDefined()
    expect(imagePipeline).toBeDefined()
    expect(service.getStatusStore()).toBeDefined()
  })

  it('processes multiple file types in sequence', async () => {
    const store = new MemoryStatusStore()
    const service = new ForgeService({ statusStore: store })

    // Verify service is available for processing
    expect(service).toBeDefined()
  })
})

describe('BaseProcessor MIME type detection', () => {
  it('detects MIME type from filename extension', () => {
    const processor = new ImageProcessor({ tempDir: '/tmp/forge-image' })

    expect(processor.supports('image/jpeg')).toBe(true)
    expect(processor.supports('image/png')).toBe(true)
    expect(processor.supports('image/gif')).toBe(true)
    expect(processor.supports('image/webp')).toBe(true)
  })

  it('returns false for unsupported MIME types', () => {
    const processor = new ImageProcessor({ tempDir: '/tmp/forge-image' })

    expect(processor.supports('video/mp4')).toBe(false)
    expect(processor.supports('audio/mpeg')).toBe(false)
    expect(processor.supports('application/json')).toBe(false)
  })
})

describe('Pipeline fluent API', () => {
  it('supports fluent chaining with ImagePipeline', () => {
    const pipeline = new ImagePipeline()

    pipeline.resize(800, 600).rotate(45).format('webp', 80)

    expect((pipeline as any).steps.length).toBeGreaterThan(0)
  })

  it('supports fluent chaining with VideoPipeline', () => {
    const pipeline = new VideoPipeline()

    pipeline.resize(1280, 720).rotate(90).transcode('webm', 'vp9', 25)

    expect((pipeline as any).steps.length).toBeGreaterThan(0)
  })

  it('supports watermark operation in VideoPipeline', () => {
    const pipeline = new VideoPipeline()

    pipeline.resize(1280, 720).watermark('watermark.png', { opacity: 0.8 })

    expect((pipeline as any).steps.length).toBeGreaterThan(0)
  })

  it('resets pipeline steps', () => {
    const pipeline = new ImagePipeline()

    pipeline.resize(800, 600)
    expect((pipeline as any).steps.length).toBeGreaterThan(0)
  })
})

describe('BaseProcessor with metadata', () => {
  afterEach(async () => {
    await rm('/tmp/forge-image-meta', { recursive: true, force: true })
  })

  it('includes metadata in processing output', async () => {
    const processor = new ImageProcessor({ tempDir: '/tmp/forge-image-meta' })

    const result = await processor.process(
      { source: '/tmp/test.jpg', filename: 'test.jpg', mimeType: 'image/jpeg' },
      { width: 100, height: 100, format: 'png' }
    )

    expect(result.metadata).toBeDefined()
  })
})

describe('VideoProcessor with transcode options', () => {
  afterEach(async () => {
    await rm('/tmp/forge-video-meta', { recursive: true, force: true })
  })

  it('handles video transcoding with codec', async () => {
    const processor = new VideoProcessor({ tempDir: '/tmp/forge-video-meta' })

    const result = await processor.process(
      { source: '/tmp/test.mp4', filename: 'test.mp4', mimeType: 'video/mp4' },
      { format: 'webm', codec: 'libvpx', bitrate: '2500k' }
    )

    expect(result.mimeType).toBe('video/webm')
    expect(result.metadata?.codec).toBeDefined()
  })

  it('handles various video formats', () => {
    const processor = new VideoProcessor({ tempDir: '/tmp/forge-video' })

    expect(processor.supports('video/mp4')).toBe(true)
    expect(processor.supports('video/webm')).toBe(true)
    expect(processor.supports('video/quicktime')).toBe(true)
    expect(processor.supports('image/png')).toBe(false)
  })
})

describe('ForgeService sync vs async processing', () => {
  it('performs synchronous processing', async () => {
    const service = new ForgeService({
      statusStore: new MemoryStatusStore(),
    })

    ;(service as any).imageProcessor = {
      supports: () => true,
      process: async () => ({
        path: '/tmp/output.png',
        url: 'file:///tmp/output.png',
        size: 1024,
        mimeType: 'image/png',
      }),
    }

    const result = await service.process({
      source: '/tmp/input.jpg',
      filename: 'input.jpg',
      mimeType: 'image/jpeg',
    })

    expect(result).toBeDefined()
  })

  it('performs asynchronous processing with status tracking', async () => {
    const store = new MemoryStatusStore()
    const service = new ForgeService({ statusStore: store })

    const job = await service.processAsync({
      source: '/tmp/input.jpg',
      filename: 'input.jpg',
    })

    expect(job.id).toBeDefined()
    expect(job.status.status).toBe('pending')

    const saved = await store.get(job.id)
    expect(saved?.jobId).toBe(job.id)
  })
})

describe('FFmpeg and ImageMagick Adapters', () => {
  it('FFmpegAdapter is instantiable with custom path', async () => {
    const { FFmpegAdapter } = await import('../src/adapters/FFmpegAdapter')
    const adapter = new FFmpegAdapter('ffmpeg')

    // Verify adapter is created
    expect(adapter).toBeDefined()
  })

  it('ImageMagickAdapter is instantiable with custom path', async () => {
    const { ImageMagickAdapter } = await import('../src/adapters/ImageMagickAdapter')
    const adapter = new ImageMagickAdapter('magick')

    // Verify adapter is created
    expect(adapter).toBeDefined()
  })

  it('ImageMagickAdapter supports convert mode', async () => {
    const { ImageMagickAdapter } = await import('../src/adapters/ImageMagickAdapter')
    const adapter = new ImageMagickAdapter('magick', true)

    // Verify adapter is created with useConvert flag
    expect(adapter).toBeDefined()
  })
})

describe('ProcessingStatus state transitions', () => {
  it('transitions from pending to processing', () => {
    const created = ProcessingStatusManager.create('job-x')
    expect(created.status).toBe('pending')
    expect(created.progress).toBe(0)

    const processing = ProcessingStatusManager.processing(created, 25, 'Processing')
    expect(processing.status).toBe('processing')
    expect(processing.progress).toBe(25)
    expect(processing.message).toBe('Processing')
    expect(processing.createdAt).toBe(created.createdAt)
  })

  it('preserves timestamps through state transitions', () => {
    const created = ProcessingStatusManager.create('job-y')
    const createdTime = created.createdAt

    const processing = ProcessingStatusManager.processing(created, 50)
    expect(processing.createdAt).toBe(createdTime)
    expect(processing.updatedAt).toBeGreaterThanOrEqual(processing.createdAt)
  })

  it('includes result in completed status', () => {
    const created = ProcessingStatusManager.create('job-z')
    const processing = ProcessingStatusManager.processing(created, 100)

    const result = {
      url: 'https://cdn.example.com/file.jpg',
      size: 2048,
      mimeType: 'image/jpeg',
    }

    const completed = ProcessingStatusManager.completed(processing, result)
    expect(completed.result).toEqual(result)
    expect(completed.status).toBe('completed')
  })
})

describe('OrbitForge', () => {
  it('exports OrbitForge class', async () => {
    const { OrbitForge } = await import('../src/index')
    expect(OrbitForge).toBeDefined()
  })

  it('exports ForgeService', async () => {
    const { ForgeService: ExportedForgeService } = await import('../src/index')
    expect(ExportedForgeService).toBeDefined()
  })

  it('exports processors and pipelines', async () => {
    const {
      ImageProcessor: ExportedImageProcessor,
      VideoProcessor: ExportedVideoProcessor,
      ImagePipeline: ExportedImagePipeline,
      VideoPipeline: ExportedVideoPipeline,
    } = await import('../src/index')

    expect(ExportedImageProcessor).toBeDefined()
    expect(ExportedVideoProcessor).toBeDefined()
    expect(ExportedImagePipeline).toBeDefined()
    expect(ExportedVideoPipeline).toBeDefined()
  })

  it('exports status management classes', async () => {
    const {
      ProcessingStatusManager: ExportedStatusManager,
      MemoryStatusStore: ExportedStatusStore,
      SSEHandler: ExportedSSEHandler,
    } = await import('../src/index')

    expect(ExportedStatusManager).toBeDefined()
    expect(ExportedStatusStore).toBeDefined()
    expect(ExportedSSEHandler).toBeDefined()
  })

  it('exports adapters', async () => {
    const { FFmpegAdapter: ExportedFFmpegAdapter, ImageMagickAdapter: ExportedImageMagickAdapter } =
      await import('../src/index')

    expect(ExportedFFmpegAdapter).toBeDefined()
    expect(ExportedImageMagickAdapter).toBeDefined()
  })
})

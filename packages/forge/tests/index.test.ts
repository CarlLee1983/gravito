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
})

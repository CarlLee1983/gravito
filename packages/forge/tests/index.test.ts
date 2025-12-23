/**
 * @fileoverview Basic tests for @gravito/forge
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { ForgeService } from '../src/ForgeService'
import { ImageProcessor } from '../src/processors/ImageProcessor'
import { VideoProcessor } from '../src/processors/VideoProcessor'
import { MemoryStatusStore } from '../src/status/StatusStore'

describe('ForgeService', () => {
  let service: ForgeService

  beforeEach(() => {
    service = new ForgeService({
      statusStore: new MemoryStatusStore(),
    })
  })

  it('should create video pipeline', () => {
    const pipeline = service.createVideoPipeline()
    expect(pipeline).toBeDefined()
  })

  it('should create image pipeline', () => {
    const pipeline = service.createImagePipeline()
    expect(pipeline).toBeDefined()
  })

  it('should get status store', () => {
    const statusStore = service.getStatusStore()
    expect(statusStore).toBeDefined()
  })
})

describe('VideoProcessor', () => {
  let processor: VideoProcessor

  beforeEach(() => {
    processor = new VideoProcessor()
  })

  it('should support video MIME types', () => {
    expect(processor.supports('video/mp4')).toBe(true)
    expect(processor.supports('video/webm')).toBe(true)
    expect(processor.supports('image/jpeg')).toBe(false)
  })
})

describe('ImageProcessor', () => {
  let processor: ImageProcessor

  beforeEach(() => {
    processor = new ImageProcessor()
  })

  it('should support image MIME types', () => {
    expect(processor.supports('image/jpeg')).toBe(true)
    expect(processor.supports('image/png')).toBe(true)
    expect(processor.supports('video/mp4')).toBe(false)
  })
})

describe('MemoryStatusStore', () => {
  let store: MemoryStatusStore

  beforeEach(() => {
    store = new MemoryStatusStore()
  })

  afterEach(() => {
    store.clear()
  })

  it('should store and retrieve status', async () => {
    const status = {
      jobId: 'test-123',
      status: 'pending' as const,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await store.set(status)
    const retrieved = await store.get('test-123')

    expect(retrieved).toEqual(status)
  })

  it('should notify listeners on status change', async () => {
    const status = {
      jobId: 'test-123',
      status: 'pending' as const,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    let notifiedStatus: typeof status | null = null
    const unsubscribe = store.onChange('test-123', (newStatus) => {
      notifiedStatus = newStatus
    })

    await store.set(status)
    expect(notifiedStatus).toEqual(status)

    unsubscribe()
  })
})

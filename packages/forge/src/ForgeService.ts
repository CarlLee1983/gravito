/**
 * @fileoverview Forge service - Core file processing service
 */

import { randomUUID } from 'node:crypto'
import { getRuntimeAdapter } from '@gravito/core'
import type { StorageProvider } from '@gravito/nebula'
import { ImagePipeline } from './pipelines/ImagePipeline'
import { VideoPipeline } from './pipelines/VideoPipeline'
import { ImageProcessor } from './processors/ImageProcessor'
import type { Processor } from './processors/Processor'
import { VideoProcessor } from './processors/VideoProcessor'
import { ProcessingStatusManager } from './status/ProcessingStatus'
import type { StatusStore } from './status/StatusStore'
import type { FileInput, FileOutput, ProcessingStatus, ProcessOptions } from './types'
import { sniffMimeType } from './utils/mime'

/**
 * Forge service configuration
 */
export interface ForgeServiceConfig {
  /**
   * Storage provider (from Nebula)
   */
  storage?: StorageProvider

  /**
   * Status store
   */
  statusStore?: StatusStore

  /**
   * Video processor options
   */
  video?: {
    ffmpegPath?: string
    tempDir?: string
  }

  /**
   * Image processor options
   */
  image?: {
    imagemagickPath?: string
    tempDir?: string
  }
}

/**
 * Processing job result
 */
export interface ProcessingJob {
  /**
   * Job ID
   */
  id: string

  /**
   * Processing status
   */
  status: ProcessingStatus
}

/**
 * Forge service
 *
 * Main service for file processing operations.
 */
export class ForgeService {
  private videoProcessor: VideoProcessor
  private imageProcessor: ImageProcessor
  private storage?: StorageProvider
  private statusStore?: StatusStore
  private runtime = getRuntimeAdapter()

  /**
   * Create a new ForgeService instance.
   *
   * @param config - The Forge service configuration.
   */
  constructor(config: ForgeServiceConfig = {}) {
    this.videoProcessor = new VideoProcessor(config.video)
    this.imageProcessor = new ImageProcessor(config.image)
    this.storage = config.storage
    this.statusStore = config.statusStore
  }

  /**
   * Process a file synchronously.
   *
   * @param input - The file input to process.
   * @param options - The processing options.
   * @returns A promise that resolves to the processed file output.
   */
  async process(
    input: FileInput,
    options: ProcessOptions & { sync?: boolean } = {}
  ): Promise<FileOutput> {
    const processor = await this.getProcessor(input)
    const output = await processor.process(input, options)

    // Upload to storage if configured
    if (this.storage && output.path) {
      const file = await this.runtime.readFileAsBlob(output.path)
      const storageKey = this.generateStorageKey(input.filename || 'processed')
      await this.storage.put(storageKey, file)
      output.url = this.storage.getUrl(storageKey)
    }

    return output
  }

  /**
   * Process a file asynchronously.
   *
   * @param input - The file input to process.
   * @param options - The processing options.
   * @returns A promise that resolves to the processing job details.
   * @throws {Error} If the status store is not configured.
   */
  async processAsync(_input: FileInput, _options: ProcessOptions = {}): Promise<ProcessingJob> {
    if (!this.statusStore) {
      throw new Error('Status store is required for async processing')
    }

    const jobId = randomUUID()
    const status = ProcessingStatusManager.create(jobId)

    // Save initial status
    await this.statusStore.set(status)

    // Return job immediately (actual processing will be done by ProcessFileJob)
    return {
      id: jobId,
      status,
    }
  }

  /**
   * Create a video processing pipeline.
   *
   * @returns A new VideoPipeline instance.
   */
  createVideoPipeline(): VideoPipeline {
    return new VideoPipeline(this.videoProcessor)
  }

  /**
   * Create an image processing pipeline.
   *
   * @returns A new ImagePipeline instance.
   */
  createImagePipeline(): ImagePipeline {
    return new ImagePipeline(this.imageProcessor)
  }

  /**
   * Get processor for file input.
   *
   * @param input - The file input.
   * @returns The appropriate Processor instance.
   * @throws {Error} If the file type is not supported.
   */
  private async getProcessor(input: FileInput): Promise<Processor> {
    const mimeType = await this.getMimeType(input)

    if (this.videoProcessor.supports(mimeType)) {
      return this.videoProcessor
    }

    if (this.imageProcessor.supports(mimeType)) {
      return this.imageProcessor
    }

    throw new Error(`Unsupported file type: ${mimeType}`)
  }

  /**
   * Get MIME type from file input.
   *
   * @param input - The file input.
   * @returns The MIME type string.
   */
  private async getMimeType(input: FileInput): Promise<string> {
    if (input.mimeType) {
      return input.mimeType
    }

    const sniffed = await sniffMimeType(input.source)
    if (sniffed) {
      return sniffed
    }

    if (input.filename) {
      const ext = input.filename.split('.').pop()?.toLowerCase()
      const mimeMap: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
      }
      return mimeMap[ext || ''] || 'application/octet-stream'
    }

    return 'application/octet-stream'
  }

  /**
   * Generate storage key.
   *
   * @param filename - The original filename.
   * @returns The generated storage key.
   */
  private generateStorageKey(filename: string): string {
    const timestamp = Date.now()
    const uuid = randomUUID().slice(0, 8)
    const ext = filename.split('.').pop() || 'bin'
    return `forge/${timestamp}-${uuid}.${ext}`
  }

  /**
   * Get status store.
   *
   * @returns The StatusStore instance, or undefined if not configured.
   */
  getStatusStore(): StatusStore | undefined {
    return this.statusStore
  }
}

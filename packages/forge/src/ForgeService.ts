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
import { DiskSpaceGuard } from './utils/DiskSpaceGuard'
import { sniffMimeType } from './utils/mime'

/**
 * Configuration schema for the ForgeService
 */
export interface ForgeServiceConfig {
  /**
   * Nebula storage provider used for persisting processed files
   */
  storage?: StorageProvider

  /**
   * Persistence layer for tracking job status
   */
  statusStore?: StatusStore

  /**
   * Video processing engine configuration
   */
  video?: {
    /**
     * Optional path to a native FFmpeg binary
     */
    ffmpegPath?: string
    /**
     * Scratch space for file operations
     */
    tempDir?: string
    /**
     * Enables FFmpeg WASM for environments without native binary access
     */
    wasmMode?: boolean
  }

  /**
   * Image processing engine configuration
   */
  image?: {
    /**
     * Optional path to ImageMagick binary
     */
    imagemagickPath?: string
    /**
     * Scratch space for file operations
     */
    tempDir?: string
  }

  /**
   * Minimum available disk space in bytes (optional)
   */
  minAvailableSpace?: number

  /**
   * Maximum concurrent processing tasks (default: Infinity)
   */
  concurrency?: number
}

/**
 * Metadata for a tracked processing task
 */
export interface ProcessingJob {
  /**
   * Unique identifier for the task
   */
  id: string

  /**
   * Snapshot of the current task state
   */
  status: ProcessingStatus
}

/**
 * Central service for orchestrating file processing workflows
 *
 * Coordinates processors, storage, and status tracking to provide a
 * high-level API for media transformations.
 *
 * @example
 * ```typescript
 * const forge = new ForgeService(config);
 * const result = await forge.process(input, { width: 1080 });
 * ```
 */
export class ForgeService {
  private videoProcessor: VideoProcessor
  private imageProcessor: ImageProcessor
  private storage?: StorageProvider
  private statusStore?: StatusStore
  private minAvailableSpace?: number
  private concurrency: number
  private activeTasks = 0
  private waitingTasks: (() => void)[] = []
  private runtime = getRuntimeAdapter()

  /**
   * Initializes a new ForgeService with optional configuration
   *
   * @param config - Initial setup for processors and infrastructure providers
   */
  constructor(config: ForgeServiceConfig = {}) {
    this.videoProcessor = new VideoProcessor(config.video)
    this.imageProcessor = new ImageProcessor(config.image)
    this.storage = config.storage
    this.statusStore = config.statusStore
    this.minAvailableSpace = config.minAvailableSpace
    this.concurrency = config.concurrency || Infinity
  }

  /**
   * Processes a file synchronously within the current request context
   *
   * This method waits for the underlying processor to finish and optionally
   * uploads the result to the configured storage provider.
   *
   * @param input - The source file (path, Blob, or Buffer)
   * @param options - Transformation parameters
   * @returns Processed file metadata and access URL
   * @throws {Error} If no suitable processor is found for the input type
   */
  async process(
    input: FileInput,
    options: ProcessOptions & { sync?: boolean } = {}
  ): Promise<FileOutput> {
    const processor = await this.getProcessor(input)

    // Check disk space if configured
    if (this.minAvailableSpace) {
      const tempDir = (processor as any).tempDir || '/tmp'
      await DiskSpaceGuard.check(tempDir, this.minAvailableSpace)
    }

    // Wait for concurrency slot
    if (this.activeTasks >= this.concurrency) {
      await new Promise<void>((resolve) => {
        this.waitingTasks.push(resolve)
      })
    }

    this.activeTasks++

    try {
      const output = await processor.process(input, options)

      // Upload to storage if configured
      if (this.storage && output.path) {
        const file = await this.runtime.readFileAsBlob(output.path)
        const storageKey = this.generateStorageKey(input.filename || 'processed')
        await this.storage.put(storageKey, file)
        output.url = this.storage.getUrl(storageKey)
      }

      return output
    } finally {
      this.activeTasks--
      // Pick next waiting task
      const next = this.waitingTasks.shift()
      if (next) {
        next()
      }
    }
  }

  /**
   * Get metadata from a file.
   *
   * @param input - The file input to probe.
   * @returns A promise that resolves to the file metadata.
   */
  async getMetadata(input: FileInput): Promise<Record<string, unknown>> {
    const processor = await this.getProcessor(input)
    return await processor.getMetadata(input)
  }

  /**
   * Initiates a background processing task
   *
   * Creates a job entry in the status store and returns immediately.
   * The actual processing should be handled by a queue worker.
   *
   * @param input - The file to be processed
   * @param options - Transformation parameters
   * @returns Reference to the created job and its initial state
   * @throws {Error} If statusStore is not configured
   */
  async processAsync(input: FileInput, _options: ProcessOptions = {}): Promise<ProcessingJob> {
    if (!this.statusStore) {
      throw new Error('Status store is required for async processing')
    }

    // Check disk space if configured
    if (this.minAvailableSpace) {
      const processor = await this.getProcessor(input)
      const tempDir = (processor as any).tempDir || '/tmp'
      await DiskSpaceGuard.check(tempDir, this.minAvailableSpace)
    }

    const jobId = crypto.randomUUID()
    const status = ProcessingStatusManager.create(jobId)

    await this.statusStore.set(status)

    return {
      id: jobId,
      status,
    }
  }

  /**
   * Creates a builder for complex video transformation chains
   *
   * @returns A new VideoPipeline instance
   */
  createVideoPipeline(): VideoPipeline {
    return new VideoPipeline(this.videoProcessor)
  }

  /**
   * Creates a builder for complex image transformation chains
   *
   * @returns A new ImagePipeline instance
   */
  createImagePipeline(): ImagePipeline {
    return new ImagePipeline(this.imageProcessor)
  }

  /**
   * Resolves the appropriate processor based on the input MIME type
   *
   * @param input - The file input to evaluate
   * @returns A processor instance capable of handling the file
   * @throws {Error} If the file type is unsupported
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
   * Inspects the input to determine its MIME type
   *
   * Uses metadata, file sniffing, or extension mapping to identify the format.
   *
   * @param input - The file input to inspect
   * @returns Normalized MIME type string
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
   * Creates a deterministic storage key for output files
   *
   * @param filename - Base name used for key generation
   * @returns A namespaced storage path
   */
  private generateStorageKey(filename: string): string {
    const timestamp = Date.now()
    const uuid = crypto.randomUUID().slice(0, 8)
    const ext = filename.split('.').pop() || 'bin'
    return `forge/${timestamp}-${uuid}.${ext}`
  }

  /**
   * Accesses the current status store instance
   *
   * @returns The active StatusStore or undefined
   */
  getStatusStore(): StatusStore | undefined {
    return this.statusStore
  }

  /**
   * Replaces the storage provider used for file persistence
   *
   * @param storage - The new Nebula storage provider
   */
  public setStorage(storage: StorageProvider): void {
    this.storage = storage
  }
}

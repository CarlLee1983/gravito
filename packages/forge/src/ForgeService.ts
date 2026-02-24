import { randomUUID } from 'node:crypto'
import type { RuntimeArchiveAdapter } from '@gravito/core'
import { getArchiveAdapter, getRuntimeAdapter } from '@gravito/core'
import type { StorageProvider } from '@gravito/nebula'
import { ImagePipeline } from './pipelines/ImagePipeline'
import { VideoPipeline } from './pipelines/VideoPipeline'
import { ImageProcessor } from './processors/ImageProcessor'
import type { Processor } from './processors/Processor'
import { VideoProcessor } from './processors/VideoProcessor'
import { ProcessingStatusManager } from './status/ProcessingStatus'
import type { StatusStore } from './status/StatusStore'
import type {
  FileInput,
  FileOutput,
  PackageResultsOptions,
  PackageResultsOutput,
  ProcessingStatus,
  ProcessOptions,
} from './types'
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
  private archive: RuntimeArchiveAdapter = getArchiveAdapter()

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

    const jobId = randomUUID()
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
    const uuid = randomUUID().slice(0, 8)
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

  /**
   * 批量打包多個已完成處理作業的結果檔案
   *
   * 從 statusStore 查詢各作業狀態，讀取對應的輸出檔案，
   * 並組織為 {jobId}/{filename} 結構打包為 tar.gz 歸檔。
   *
   * @param jobIds - 要打包的作業 ID 清單
   * @param outputPath - 輸出的 tar.gz 路徑
   * @param options - 打包選項（壓縮、過濾）
   * @returns 打包結果摘要（成功數量與失敗清單）
   */
  async packageProcessingResults(
    jobIds: readonly string[],
    outputPath: string,
    options: PackageResultsOptions = {}
  ): Promise<PackageResultsOutput> {
    if (!this.statusStore) {
      throw new Error('[ForgeService] statusStore 未設定，無法打包處理結果')
    }

    const entries: Record<string, string | Blob | ArrayBuffer | Uint8Array> = {}
    const errors: Array<{ jobId: string; error: string }> = []
    let fileCount = 0

    for (const jobId of jobIds) {
      try {
        const status = await this.statusStore.get(jobId)
        if (!status) {
          errors.push({ jobId, error: '作業不存在' })
          continue
        }
        if (status.status !== 'completed') {
          errors.push({ jobId, error: `作業尚未完成（狀態：${status.status}）` })
          continue
        }
        if (!status.result) {
          errors.push({ jobId, error: '作業無輸出結果' })
          continue
        }

        const output = status.result
        // 從 URL 或 path 中取得檔名
        const fileName = this.extractFileName(output)

        // 若有 pattern 過濾，跳過不符合的檔案
        if (options.pattern && !this.matchesPattern(fileName, options.pattern)) {
          continue
        }

        // 讀取檔案內容
        const fileData = await this.readOutputFile(output)
        if (fileData) {
          entries[`${jobId}/${fileName}`] = fileData
          fileCount++
        } else {
          errors.push({ jobId, error: '無法讀取輸出檔案' })
        }
      } catch (err) {
        errors.push({
          jobId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // 打包為 tar.gz
    const archiveData = await this.archive.create(entries, {
      compress: options.compress ?? 'gzip',
    })
    await this.runtime.writeFile(outputPath, archiveData)

    return {
      archivePath: outputPath,
      fileCount,
      errors,
    }
  }

  /**
   * 下載單一作業的結果檔案到本地目錄
   *
   * @param jobId - 目標作業 ID
   * @param outputDir - 輸出目錄
   * @returns 已下載的檔案清單
   */
  async downloadResults(jobId: string, outputDir: string): Promise<readonly FileOutput[]> {
    if (!this.statusStore) {
      throw new Error('[ForgeService] statusStore 未設定，無法下載處理結果')
    }

    const status = await this.statusStore.get(jobId)
    if (!status) {
      throw new Error(`[ForgeService] 作業不存在：${jobId}`)
    }
    if (status.status !== 'completed' || !status.result) {
      throw new Error(`[ForgeService] 作業尚未完成或無輸出：${jobId}`)
    }

    const output = status.result
    const fileName = this.extractFileName(output)

    // 確保輸出目錄存在（忽略已存在的錯誤）
    try {
      const { mkdir } = await import('node:fs/promises')
      await mkdir(outputDir, { recursive: true })
    } catch {
      // 目錄已存在或無法建立，繼續寫入
    }

    // 讀取原始檔案並寫入到 outputDir
    const fileData = await this.readOutputFile(output)
    if (!fileData) {
      throw new Error(`[ForgeService] 無法讀取輸出檔案：${output.url ?? output.path ?? ''}`)
    }

    const localPath = `${outputDir}/${fileName}`
    await this.runtime.writeFile(localPath, fileData)

    return [
      {
        ...output,
        path: localPath,
      },
    ]
  }

  // ============ 私有輔助方法 ============

  /**
   * 從 FileOutput 取得檔名
   * @internal
   */
  private extractFileName(output: FileOutput): string {
    if (output.path) {
      return output.path.split('/').pop() ?? 'output'
    }
    if (output.url) {
      return output.url.split('/').pop()?.split('?')[0] ?? 'output'
    }
    return `output-${randomUUID().slice(0, 8)}`
  }

  /**
   * 讀取輸出檔案內容（優先使用 path，其次 URL）
   * @internal
   */
  private async readOutputFile(output: FileOutput): Promise<Uint8Array | null> {
    // 優先使用本地路徑
    if (output.path) {
      try {
        return await this.runtime.readFile(output.path)
      } catch {
        return null
      }
    }

    // 若有 URL，從 storage 下載
    if (output.url && this.storage) {
      try {
        const storageKey = this.extractStorageKey(output.url)
        const blob = await this.storage.get(storageKey)
        if (blob) {
          return new Uint8Array(await blob.arrayBuffer())
        }
      } catch {
        return null
      }
    }

    return null
  }

  /**
   * 從 URL 中提取 storage key
   * @internal
   */
  private extractStorageKey(url: string): string {
    try {
      const parsed = new URL(url)
      // 移除開頭的 '/'
      return parsed.pathname.slice(1)
    } catch {
      return url
    }
  }

  /**
   * 檢查檔名是否符合 glob pattern（簡易實作）
   * @internal
   */
  private matchesPattern(fileName: string, pattern: string): boolean {
    // 將 glob 轉為 RegExp（僅支援 * 萬用字元）
    const regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    return new RegExp(`^${regexStr}$`).test(fileName)
  }
}

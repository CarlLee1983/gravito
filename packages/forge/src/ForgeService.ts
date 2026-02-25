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
  storage?: StorageProvider
  statusStore?: StatusStore
  video?: {
    ffmpegPath?: string
    tempDir?: string
    wasmMode?: boolean
  }
  image?: {
    imagemagickPath?: string
    tempDir?: string
  }
  minAvailableSpace?: number
  concurrency?: number
}

/**
 * Metadata for a tracked processing task
 */
export interface ProcessingJob {
  id: string
  status: ProcessingStatus
}

/**
 * Central service for orchestrating file processing workflows
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

  constructor(config: ForgeServiceConfig = {}) {
    this.videoProcessor = new VideoProcessor(config.video)
    this.imageProcessor = new ImageProcessor(config.image)
    this.storage = config.storage
    this.statusStore = config.statusStore
    this.minAvailableSpace = config.minAvailableSpace
    this.concurrency = config.concurrency || Infinity
  }

  async process(
    input: FileInput,
    options: ProcessOptions & { sync?: boolean } = {}
  ): Promise<FileOutput> {
    const processor = await this.getProcessor(input)
    if (this.minAvailableSpace) {
      const tempDir = (processor as any).tempDir || '/tmp'
      await DiskSpaceGuard.check(tempDir, this.minAvailableSpace)
    }
    if (this.activeTasks >= this.concurrency) {
      await new Promise<void>((resolve) => {
        this.waitingTasks.push(resolve)
      })
    }
    this.activeTasks++
    try {
      const output = await processor.process(input, options)
      if (this.storage && output.path) {
        const file = await this.runtime.readFileAsBlob(output.path)
        const storageKey = this.generateStorageKey(input.filename || 'processed')
        await this.storage.put(storageKey, file)
        output.url = this.storage.getUrl(storageKey)
      }
      return output
    } finally {
      this.activeTasks--
      const next = this.waitingTasks.shift()
      if (next) {
        next()
      }
    }
  }

  async getMetadata(input: FileInput): Promise<Record<string, unknown>> {
    const processor = await this.getProcessor(input)
    return await processor.getMetadata(input)
  }

  async processAsync(input: FileInput, _options: ProcessOptions = {}): Promise<ProcessingJob> {
    if (!this.statusStore) {
      throw new Error('Status store is required for async processing')
    }
    if (this.minAvailableSpace) {
      const processor = await this.getProcessor(input)
      const tempDir = (processor as any).tempDir || '/tmp'
      await DiskSpaceGuard.check(tempDir, this.minAvailableSpace)
    }
    const jobId = crypto.randomUUID()
    const status = ProcessingStatusManager.create(jobId)
    await this.statusStore.set(status)
    return { id: jobId, status }
  }

  createVideoPipeline(): VideoPipeline {
    return new VideoPipeline(this.videoProcessor)
  }

  createImagePipeline(): ImagePipeline {
    return new ImagePipeline(this.imageProcessor)
  }

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

  private generateStorageKey(filename: string): string {
    const timestamp = Date.now()
    const uuid = crypto.randomUUID().slice(0, 8)
    const ext = filename.split('.').pop() || 'bin'
    return `forge/${timestamp}-${uuid}.${ext}`
  }

  getStatusStore(): StatusStore | undefined {
    return this.statusStore
  }

  public setStorage(storage: StorageProvider): void {
    this.storage = storage
  }

  async packageProcessingResults(
    jobIds: readonly string[],
    outputPath: string,
    options: PackageResultsOptions = {}
  ): Promise<PackageResultsOutput> {
    if (!this.statusStore) {
      throw new Error('[ForgeService] statusStore 未設定')
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
          errors.push({ jobId, error: `作業尚未完成（${status.status}）` })
          continue
        }
        if (!status.result) {
          errors.push({ jobId, error: '作業無輸出' })
          continue
        }
        const output = status.result
        const fileName = this.extractFileName(output)
        if (options.pattern && !this.matchesPattern(fileName, options.pattern)) {
          continue
        }
        const fileData = await this.readOutputFile(output)
        if (fileData) {
          entries[`${jobId}/${fileName}`] = fileData
          fileCount++
        } else {
          errors.push({ jobId, error: '無法讀取輸出檔案' })
        }
      } catch (err) {
        errors.push({ jobId, error: err instanceof Error ? err.message : String(err) })
      }
    }
    const archiveData = await this.archive.create(entries, { compress: options.compress ?? 'gzip' })
    await this.runtime.writeFile(outputPath, archiveData)
    return { archivePath: outputPath, fileCount, errors }
  }

  async downloadResults(jobId: string, outputDir: string): Promise<readonly FileOutput[]> {
    if (!this.statusStore) {
      throw new Error('[ForgeService] statusStore 未設定')
    }
    const status = await this.statusStore.get(jobId)
    if (!status || status.status !== 'completed' || !status.result) {
      throw new Error(`[ForgeService] 作業不存在或尚未完成：${jobId}`)
    }
    const output = status.result
    const fileName = this.extractFileName(output)
    try {
      await this.runtime.mkdir(outputDir, { recursive: true })
    } catch {}
    const fileData = await this.readOutputFile(output)
    if (!fileData) {
      throw new Error(`[ForgeService] 無法讀取輸出檔案`)
    }
    const localPath = `${outputDir}/${fileName}`
    await this.runtime.writeFile(localPath, fileData)
    return [{ ...output, path: localPath }]
  }

  private extractFileName(output: FileOutput): string {
    if (output.path) {
      return output.path.split('/').pop() ?? 'output'
    }
    if (output.url) {
      return output.url.split('/').pop()?.split('?')[0] ?? 'output'
    }
    return `output-${crypto.randomUUID().slice(0, 8)}`
  }

  private async readOutputFile(output: FileOutput): Promise<Uint8Array | null> {
    if (output.path) {
      try {
        return await this.runtime.readFile(output.path)
      } catch {
        return null
      }
    }
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

  private extractStorageKey(url: string): string {
    try {
      const parsed = new URL(url)
      return parsed.pathname.slice(1)
    } catch {
      return url
    }
  }

  private matchesPattern(fileName: string, pattern: string): boolean {
    const regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    return new RegExp(`^${regexStr}$`).test(fileName)
  }
}

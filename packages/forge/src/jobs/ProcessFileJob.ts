/**
 * @fileoverview Process file job for async processing
 */

import type { StorageProvider } from '@gravito/nebula'
import { Job } from '@gravito/stream'
import type { ForgeService } from '../ForgeService'
import { ProcessingStatusManager } from '../status/ProcessingStatus'
import type { StatusStore } from '../status/StatusStore'
import type { FileInput, FileOutput, ProcessingProgress, ProcessOptions } from '../types'

/**
 * Process file job data
 */
export interface ProcessFileJobData {
  /**
   * Job ID
   */
  jobId: string

  /**
   * File input
   */
  input: FileInput

  /**
   * Processing options
   */
  options: ProcessOptions

  /**
   * Status store (will be resolved from context)
   */
  statusStore?: StatusStore

  /**
   * Storage provider (will be resolved from context)
   */
  storage?: StorageProvider

  /**
   * Forge service (will be resolved from context)
   */
  forgeService?: ForgeService
}

/**
 * Process file job
 *
 * Handles async file processing with status tracking.
 */
export class ProcessFileJob extends Job {
  private data: ProcessFileJobData

  constructor(data: ProcessFileJobData) {
    super()
    this.data = data
  }

  /**
   * Handle job execution
   */
  async handle(): Promise<void> {
    const { jobId, input, options, statusStore, storage, forgeService } = this.data

    if (!statusStore) {
      throw new Error('Status store is required for ProcessFileJob')
    }

    if (!forgeService) {
      throw new Error('Forge service is required for ProcessFileJob')
    }

    try {
      // Get current status
      let status = await statusStore.get(jobId)
      if (!status) {
        status = ProcessingStatusManager.create(jobId)
      }

      // Update status to processing
      status = ProcessingStatusManager.processing(status, 0, 'Starting processing')
      await statusStore.set(status)

      // Process file with progress tracking
      const output = await forgeService.process(input, {
        ...options,
        onProgress: async (progress: ProcessingProgress) => {
          if (status) {
            status = ProcessingStatusManager.processing(status, progress.progress, progress.message)
            await statusStore.set(status)
          }
        },
      })

      // Upload to storage if configured
      if (storage && output.path) {
        status = ProcessingStatusManager.processing(status, 90, 'Uploading to storage')
        await statusStore.set(status)

        const file = Bun.file(output.path)
        const storageKey = this.generateStorageKey(input.filename || 'processed')
        await storage.put(storageKey, file)
        output.url = storage.getUrl(storageKey)

        // Clean up temp file
        try {
          await Bun.write('/dev/null', file) // Trigger file read to ensure it's closed
        } catch {
          // Ignore cleanup errors
        }
      }

      // Mark as completed
      status = ProcessingStatusManager.completed(status, output)
      await statusStore.set(status)
    } catch (error) {
      // Get current status
      let status = await statusStore.get(jobId)
      if (!status) {
        status = ProcessingStatusManager.create(jobId)
      }

      // Mark as failed
      const errorMessage = error instanceof Error ? error.message : String(error)
      status = ProcessingStatusManager.failed(status, errorMessage)
      await statusStore.set(status)

      throw error
    }
  }

  /**
   * Handle job failure
   *
   * @param error - Error instance
   */
  override async failed(error: Error): Promise<void> {
    const { jobId, statusStore } = this.data

    if (statusStore) {
      const status = await statusStore.get(jobId)
      if (status) {
        const failedStatus = ProcessingStatusManager.failed(status, error.message)
        await statusStore.set(failedStatus)
      }
    }
  }

  /**
   * Generate storage key
   *
   * @param filename - Original filename
   * @returns Storage key
   */
  private generateStorageKey(filename: string): string {
    const timestamp = Date.now()
    const uuid = this.data.jobId.slice(0, 8)
    const ext = filename.split('.').pop() || 'bin'
    return `forge/${timestamp}-${uuid}.${ext}`
  }
}

/**
 * @fileoverview Processing status management
 */

import type { FileOutput, ProcessingStatus } from '../types'

/**
 * Status change callback
 */
export type StatusChangeCallback = (status: ProcessingStatus) => void

/**
 * Processing status manager
 */
export class ProcessingStatusManager {
  /**
   * Create a new processing status
   *
   * @param jobId - Job ID
   * @returns Initial processing status
   */
  static create(jobId: string): ProcessingStatus {
    const now = Date.now()
    return {
      jobId,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * Update processing status
   *
   * @param status - Current status
   * @param updates - Status updates
   * @returns Updated status
   */
  static update(
    status: ProcessingStatus,
    updates: Partial<Omit<ProcessingStatus, 'jobId' | 'createdAt'>>
  ): ProcessingStatus {
    return {
      ...status,
      ...updates,
      updatedAt: Date.now(),
    }
  }

  /**
   * Mark status as processing
   *
   * @param status - Current status
   * @param progress - Progress percentage (0-100)
   * @param message - Optional message
   * @returns Updated status
   */
  static processing(
    status: ProcessingStatus,
    progress: number,
    message?: string
  ): ProcessingStatus {
    return this.update(status, {
      status: 'processing',
      progress: Math.max(0, Math.min(100, progress)),
      message,
    })
  }

  /**
   * Mark status as completed
   *
   * @param status - Current status
   * @param result - Processing result
   * @returns Updated status
   */
  static completed(status: ProcessingStatus, result: FileOutput): ProcessingStatus {
    return this.update(status, {
      status: 'completed',
      progress: 100,
      result,
    })
  }

  /**
   * Mark status as failed
   *
   * @param status - Current status
   * @param error - Error message
   * @returns Updated status
   */
  static failed(status: ProcessingStatus, error: string): ProcessingStatus {
    return this.update(status, {
      status: 'failed',
      error,
    })
  }
}

/**
 * @fileoverview Status store for processing status tracking
 */

import type { ProcessingStatus } from '../types'
import type { StatusChangeCallback } from './ProcessingStatus'

/**
 * Status store interface
 */
export interface StatusStore {
  /**
   * Get status by job ID
   *
   * @param jobId - Job ID
   * @returns Processing status or null
   */
  get(jobId: string): Promise<ProcessingStatus | null>

  /**
   * Set status
   *
   * @param status - Processing status
   */
  set(status: ProcessingStatus): Promise<void>

  /**
   * Delete status
   *
   * @param jobId - Job ID
   */
  delete(jobId: string): Promise<void>

  /**
   * Subscribe to status changes
   *
   * @param jobId - Job ID
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  onChange(jobId: string, callback: StatusChangeCallback): () => void
}

/**
 * Memory-based status store
 *
 * Suitable for development and single-instance deployments.
 */
export class MemoryStatusStore implements StatusStore {
  private store = new Map<string, ProcessingStatus>()
  private listeners = new Map<string, Set<StatusChangeCallback>>()

  /**
   * Get status by job ID
   *
   * @param jobId - Job ID
   * @returns Processing status or null
   */
  async get(jobId: string): Promise<ProcessingStatus | null> {
    return this.store.get(jobId) || null
  }

  /**
   * Set status
   *
   * @param status - Processing status
   */
  async set(status: ProcessingStatus): Promise<void> {
    this.store.set(status.jobId, status)

    // Notify listeners
    const callbacks = this.listeners.get(status.jobId)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(status)
        } catch (error) {
          console.error('[MemoryStatusStore] Error in callback:', error)
        }
      })
    }
  }

  /**
   * Delete status
   *
   * @param jobId - Job ID
   */
  async delete(jobId: string): Promise<void> {
    this.store.delete(jobId)
    this.listeners.delete(jobId)
  }

  /**
   * Subscribe to status changes
   *
   * @param jobId - Job ID
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  onChange(jobId: string, callback: StatusChangeCallback): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set())
    }

    const callbacks = this.listeners.get(jobId)!
    callbacks.add(callback)

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.listeners.delete(jobId)
      }
    }
  }

  /**
   * Clear all statuses (for testing)
   */
  clear(): void {
    this.store.clear()
    this.listeners.clear()
  }
}

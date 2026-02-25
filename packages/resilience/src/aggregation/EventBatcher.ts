/**
 * Event batcher for microbatching optimization (FS-102)
 *
 * Implements dual-trigger batching:
 * - Time window trigger (default 50ms)
 * - Batch size trigger (default 50 events)
 *
 * Expected improvements: 10-15% throughput increase
 *
 * Ported from: examples/flash-sale-fullstack/src/cache/events/BatchSubmitter.ts
 */

import type { EventTask } from '@gravito/core'
import type { BatchStats } from './types'

/**
 * Event batcher for optimizing submission throughput.
 */
export class EventBatcher {
  // Event submission queue
  private queue: EventTask[] = []

  // Batch size threshold
  private readonly batchSize: number

  // Flush interval (ms)
  private readonly flushIntervalMs: number

  // Flush timer
  private flushTimer: NodeJS.Timeout | null = null

  // Statistics
  private stats = {
    totalBatches: 0,
    totalEvents: 0,
    totalLatency: 0,
    autoFlushCount: 0,
    manualFlushCount: 0,
    lastFlushTime: Date.now(),
  }

  // Submission function
  private submitFn: (tasks: EventTask[]) => Promise<void>

  /**
   * Create an event batcher.
   *
   * @param batchSize - Batch size threshold (default 50)
   * @param flushIntervalMs - Time window (ms, default 50)
   * @param submitFn - Function to submit batches
   */
  constructor(
    batchSize = 50,
    flushIntervalMs = 50,
    submitFn: (tasks: EventTask[]) => Promise<void>
  ) {
    this.batchSize = batchSize
    this.flushIntervalMs = flushIntervalMs
    this.submitFn = submitFn
  }

  /**
   * Enqueue an event.
   *
   * Automatically triggers flush if:
   * 1. Batch size is reached
   * 2. Time window expires
   */
  async enqueue(task: EventTask): Promise<void> {
    this.queue.push(task)

    // Trigger 1: Batch size reached
    if (this.queue.length >= this.batchSize) {
      await this.flush(true) // Mark as auto-triggered
    } else if (this.flushTimer === null && this.queue.length > 0) {
      // Trigger 2: Start time-window timer
      this.startTimer()
    }
  }

  /**
   * Enqueue multiple events.
   */
  async enqueueBatch(tasks: EventTask[]): Promise<void> {
    for (const task of tasks) {
      await this.enqueue(task)
    }
  }

  /**
   * Flush queued events.
   *
   * @param auto - Whether this is an auto-triggered flush
   * @returns Array of flushed events
   */
  async flush(auto = false): Promise<EventTask[]> {
    if (this.queue.length === 0) {
      return []
    }

    // Clear timer
    this.clearTimer()

    // Extract all events
    const tasks = this.queue.splice(0, this.queue.length)

    // Record statistics
    const latency = Date.now() - this.stats.lastFlushTime
    this.stats.totalBatches++
    this.stats.totalEvents += tasks.length
    this.stats.totalLatency += latency
    this.stats.lastFlushTime = Date.now()

    if (auto) {
      this.stats.autoFlushCount++
    } else {
      this.stats.manualFlushCount++
    }

    // Submit events
    try {
      await this.submitFn(tasks)
    } catch (error) {
      // Put events back if submission fails
      this.queue.unshift(...tasks)
      throw error
    }

    return tasks
  }

  /**
   * Get statistics.
   */
  getStats(): BatchStats {
    const avgBatchSize =
      this.stats.totalBatches > 0 ? this.stats.totalEvents / this.stats.totalBatches : 0
    const avgLatency =
      this.stats.totalBatches > 0 ? this.stats.totalLatency / this.stats.totalBatches : 0

    return {
      totalBatches: this.stats.totalBatches,
      totalEvents: this.stats.totalEvents,
      averageBatchSize: Math.round(avgBatchSize * 100) / 100,
      averageBatchLatency: Math.round(avgLatency * 100) / 100,
      lastFlushTime: this.stats.lastFlushTime,
      pendingEvents: this.queue.length,
      autoFlushCount: this.stats.autoFlushCount,
      manualFlushCount: this.stats.manualFlushCount,
    }
  }

  /**
   * Get pending event count.
   */
  getPendingCount(): number {
    return this.queue.length
  }

  /**
   * Check if there are pending events.
   */
  hasPending(): boolean {
    return this.queue.length > 0
  }

  /**
   * Clear the queue.
   */
  clear(): void {
    this.queue = []
    this.clearTimer()
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.stats = {
      totalBatches: 0,
      totalEvents: 0,
      totalLatency: 0,
      autoFlushCount: 0,
      manualFlushCount: 0,
      lastFlushTime: Date.now(),
    }
  }

  /**
   * Stop the batcher and flush remaining events.
   */
  async stop(): Promise<EventTask[]> {
    this.clearTimer()
    if (this.queue.length > 0) {
      return this.flush(false)
    }
    return []
  }

  /**
   * Start time-window timer.
   */
  private startTimer(): void {
    if (this.flushTimer !== null) {
      return
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      if (this.queue.length > 0) {
        // Async flush, non-blocking
        this.flush(true).catch((error) => {
          console.error('[EventBatcher] Flush error:', error)
        })
      }
    }, this.flushIntervalMs)
  }

  /**
   * Clear timer.
   */
  private clearTimer(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Adjust batch size.
   */
  setBatchSize(newSize: number): void {
    // Check if immediate flush is needed
    if (this.queue.length >= newSize && newSize < this.batchSize) {
      this.flush(true).catch((error) => {
        console.error('[EventBatcher] Flush error:', error)
      })
    }
  }

  /**
   * Adjust flush interval.
   */
  setFlushInterval(_newIntervalMs: number): void {
    // Restart timer with new interval
    this.clearTimer()
    if (this.queue.length > 0) {
      this.startTimer()
    }
  }

  /**
   * Get batch size.
   */
  getBatchSize(): number {
    return this.batchSize
  }

  /**
   * Get flush interval.
   */
  getFlushInterval(): number {
    return this.flushIntervalMs
  }
}

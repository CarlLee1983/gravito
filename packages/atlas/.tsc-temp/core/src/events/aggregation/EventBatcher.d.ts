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
import type { EventTask } from '../types'
import type { BatchStats } from './types'
/**
 * Event batcher for optimizing submission throughput.
 */
export declare class EventBatcher {
  private queue
  private readonly batchSize
  private readonly flushIntervalMs
  private flushTimer
  private stats
  private submitFn
  /**
   * Create an event batcher.
   *
   * @param batchSize - Batch size threshold (default 50)
   * @param flushIntervalMs - Time window (ms, default 50)
   * @param submitFn - Function to submit batches
   */
  constructor(
    batchSize: number,
    flushIntervalMs: number,
    submitFn: (tasks: EventTask[]) => Promise<void>
  )
  /**
   * Enqueue an event.
   *
   * Automatically triggers flush if:
   * 1. Batch size is reached
   * 2. Time window expires
   */
  enqueue(task: EventTask): Promise<void>
  /**
   * Enqueue multiple events.
   */
  enqueueBatch(tasks: EventTask[]): Promise<void>
  /**
   * Flush queued events.
   *
   * @param auto - Whether this is an auto-triggered flush
   * @returns Array of flushed events
   */
  flush(auto?: boolean): Promise<EventTask[]>
  /**
   * Get statistics.
   */
  getStats(): BatchStats
  /**
   * Get pending event count.
   */
  getPendingCount(): number
  /**
   * Check if there are pending events.
   */
  hasPending(): boolean
  /**
   * Clear the queue.
   */
  clear(): void
  /**
   * Reset statistics.
   */
  resetStats(): void
  /**
   * Stop the batcher and flush remaining events.
   */
  stop(): Promise<EventTask[]>
  /**
   * Start time-window timer.
   */
  private startTimer
  /**
   * Clear timer.
   */
  private clearTimer
  /**
   * Adjust batch size.
   */
  setBatchSize(newSize: number): void
  /**
   * Adjust flush interval.
   */
  setFlushInterval(_newIntervalMs: number): void
  /**
   * Get batch size.
   */
  getBatchSize(): number
  /**
   * Get flush interval.
   */
  getFlushInterval(): number
}

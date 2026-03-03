/**
 * Event aggregation manager (FS-102)
 *
 * Coordinates deduplication and batching for optimal event processing:
 * - Event deduplication (pattern-based or idempotency-key based)
 * - Micro-batching (time and size dual-trigger)
 * - Backpressure-aware window adjustment
 * - Complete statistics tracking
 *
 * Ported from: examples/flash-sale-fullstack/src/cache/events/EventAggregator.ts
 */
import type { BackpressureManager } from '../BackpressureManager'
import type { EventTask } from '../types'
import { AggregationWindow } from './AggregationWindow'
import { DeduplicationManager } from './DeduplicationManager'
import { EventBatcher } from './EventBatcher'
import type { AggregationConfig, AggregationStats } from './types'
/**
 * Event aggregation manager.
 */
export declare class EventAggregationManager {
  private deduplicator
  private batcher
  private window
  private config
  private backpressureManager?
  private submitToQueueFn?
  private disabled
  /**
   * Create an event aggregation manager.
   */
  constructor(config?: Partial<AggregationConfig>)
  /**
   * Set backpressure manager for window adjustment.
   * FS-103：Also sets BackpressureManager on AggregationWindow for feedback loop.
   */
  setBackpressureManager(backpressure: BackpressureManager): void
  /**
   * Set the actual queue submission function.
   */
  setSubmitToQueueFn(fn: (tasks: EventTask[]) => Promise<void>): void
  /**
   * Submit an event for aggregation.
   *
   * Returns true if accepted, false if rejected due to backpressure.
   */
  submit(task: EventTask): Promise<boolean>
  /**
   * Submit multiple events.
   */
  submitBatch(tasks: EventTask[]): Promise<number>
  /**
   * Flush current batch to queue.
   */
  flush(): Promise<EventTask[]>
  /**
   * Get aggregation statistics.
   */
  getStats(): AggregationStats
  /**
   * Reset statistics.
   */
  resetStats(): void
  /**
   * Clear aggregation state.
   */
  clear(): void
  /**
   * Check if there are pending events.
   */
  hasPending(): boolean
  /**
   * Get pending event count.
   */
  getPendingCount(): number
  /**
   * Disable the aggregation manager.
   */
  disable(): void
  /**
   * Enable the aggregation manager.
   */
  enable(): void
  /**
   * Check if aggregation manager is enabled.
   */
  isEnabled(): boolean
  /**
   * Shutdown the aggregation manager.
   */
  shutdown(): Promise<EventTask[]>
  /**
   * Submit deduplicated events to queue.
   */
  private submitToQueue
  /**
   * Get deduplication manager (for testing).
   */
  __getDeduplicator(): DeduplicationManager
  /**
   * Get event batcher (for testing).
   */
  __getBatcher(): EventBatcher
  /**
   * Get aggregation window (for testing).
   */
  __getWindow(): AggregationWindow
}

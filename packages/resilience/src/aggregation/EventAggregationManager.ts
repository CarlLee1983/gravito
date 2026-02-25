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

import type { EventTask } from '@gravito/core'
import type { BackpressureManager } from '../backpressure'
import { BackpressureState } from '../backpressure'
import { AggregationWindow } from './AggregationWindow'
import { DeduplicationManager } from './DeduplicationManager'
import { EventBatcher } from './EventBatcher'
import type { AggregationConfig, AggregationStats } from './types'
import { DEFAULT_AGGREGATION_CONFIG, DEFAULT_WINDOW_ADJUSTMENT, getSuggestedWindow } from './types'

/**
 * Event aggregation manager.
 */
export class EventAggregationManager {
  // Core components
  private deduplicator: DeduplicationManager
  private batcher: EventBatcher
  private window: AggregationWindow

  // Configuration
  private config: Required<AggregationConfig>

  // Backpressure manager reference (optional)
  private backpressureManager?: BackpressureManager

  // Submission function to queue
  private submitToQueueFn?: (tasks: EventTask[]) => Promise<void>

  // Disabled flag
  private disabled = false

  /**
   * Create an event aggregation manager.
   */
  constructor(config?: Partial<AggregationConfig>) {
    this.config = {
      ...DEFAULT_AGGREGATION_CONFIG,
      ...config,
    }

    // Initialize components
    this.deduplicator = new DeduplicationManager(this.config)

    // Initialize batcher with default submit function (override later)
    this.batcher = new EventBatcher(
      this.config.batchSize ?? 50,
      this.config.windowMs ?? 200,
      (tasks) => this.submitToQueue(tasks)
    )

    this.window = new AggregationWindow(this.config.windowMs ?? 200)
  }

  /**
   * Set backpressure manager for window adjustment.
   * FS-103：Also sets BackpressureManager on AggregationWindow for feedback loop.
   */
  setBackpressureManager(backpressure: BackpressureManager): void {
    this.backpressureManager = backpressure
    // === FS-103：Enable bidirectional feedback between AggregationWindow and BackpressureManager ===
    this.window.setBackpressureManager(backpressure)
  }

  /**
   * Set the actual queue submission function.
   */
  setSubmitToQueueFn(fn: (tasks: EventTask[]) => Promise<void>): void {
    this.submitToQueueFn = fn
  }

  /**
   * Submit an event for aggregation.
   *
   * Returns true if accepted, false if rejected due to backpressure.
   */
  async submit(task: EventTask): Promise<boolean> {
    if (this.disabled) {
      throw new Error('[EventAggregationManager] Manager is disabled')
    }

    // Check backpressure state
    if (this.backpressureManager) {
      const state = this.backpressureManager.getState()

      // Adjust window based on backpressure
      const suggestedWindow = getSuggestedWindow(state, DEFAULT_WINDOW_ADJUSTMENT)
      if (suggestedWindow !== this.window.getCurrentWindow()) {
        this.window.adjustWindow(state)
        this.batcher.setFlushInterval(this.window.getCurrentWindow())
      }

      // Reject if overflow
      if (state === BackpressureState.OVERFLOW) {
        return false
      }
    }

    // Add to deduplicator
    this.deduplicator.addEvent(task)

    // Get deduplicated events
    const deduplicated = this.deduplicator.getDeduplicated()

    // Submit to batcher
    for (const event of deduplicated) {
      await this.batcher.enqueue(event)
    }

    return true
  }

  /**
   * Submit multiple events.
   */
  async submitBatch(tasks: EventTask[]): Promise<number> {
    let accepted = 0

    for (const task of tasks) {
      const result = await this.submit(task)
      if (result) {
        accepted++
      }
    }

    return accepted
  }

  /**
   * Flush current batch to queue.
   */
  async flush(): Promise<EventTask[]> {
    return this.batcher.flush(false)
  }

  /**
   * Get aggregation statistics.
   */
  getStats(): AggregationStats {
    return {
      deduplication: this.deduplicator.getStats(),
      batching: this.batcher.getStats(),
      window: this.window.getStats(),
      timestamp: Date.now(),
    }
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.deduplicator.resetStats()
    this.batcher.resetStats()
  }

  /**
   * Clear aggregation state.
   */
  clear(): void {
    this.deduplicator.clear()
    this.batcher.clear()
  }

  /**
   * Check if there are pending events.
   */
  hasPending(): boolean {
    return this.batcher.hasPending()
  }

  /**
   * Get pending event count.
   */
  getPendingCount(): number {
    return this.batcher.getPendingCount()
  }

  /**
   * Disable the aggregation manager.
   */
  disable(): void {
    this.disabled = true
  }

  /**
   * Enable the aggregation manager.
   */
  enable(): void {
    this.disabled = false
  }

  /**
   * Check if aggregation manager is enabled.
   */
  isEnabled(): boolean {
    return !this.disabled
  }

  /**
   * Shutdown the aggregation manager.
   */
  async shutdown(): Promise<EventTask[]> {
    const pending = await this.batcher.stop()
    this.deduplicator.shutdown()
    return pending
  }

  /**
   * Submit deduplicated events to queue.
   */
  private async submitToQueue(tasks: EventTask[]): Promise<void> {
    if (!this.submitToQueueFn) {
      throw new Error('[EventAggregationManager] Queue submission function not configured')
    }

    await this.submitToQueueFn(tasks)
  }

  /**
   * Get deduplication manager (for testing).
   */
  __getDeduplicator(): DeduplicationManager {
    return this.deduplicator
  }

  /**
   * Get event batcher (for testing).
   */
  __getBatcher(): EventBatcher {
    return this.batcher
  }

  /**
   * Get aggregation window (for testing).
   */
  __getWindow(): AggregationWindow {
    return this.window
  }
}

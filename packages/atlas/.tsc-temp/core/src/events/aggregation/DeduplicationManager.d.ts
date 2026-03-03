/**
 * Event deduplication manager (FS-102)
 *
 * Merges events with the same pattern/idempotency key to reduce duplicates.
 * - Pattern-based deduplication
 * - Priority-aware merge strategy
 * - Wildcard pattern aggregation
 * - Deduplication rate tracking
 *
 * Ported from: examples/flash-sale-fullstack/src/cache/events/EventDeduplicator.ts
 */
import type { EventTask } from '../types'
import type { AggregationConfig, DeduplicationStats } from './types'
/**
 * Event deduplication manager using pattern matching.
 */
export declare class DeduplicationManager {
  private patternMap
  private stats
  private regexCache
  private cachedDeduplicated
  private deduplicatedDirty
  private config
  private patternTimestamps
  private cleanupTimer
  /**
   * Create a deduplication manager.
   */
  constructor(config?: Partial<AggregationConfig>)
  /**
   * Add an event for deduplication.
   *
   * Rules:
   * 1. Events with same pattern are merged into one
   * 2. Higher priority events are kept, lower priority removed
   * 3. If new event has higher priority, it replaces old event
   */
  addEvent(event: EventTask): void
  /**
   * Add multiple events.
   */
  addEvents(events: EventTask[]): void
  /**
   * Get all deduplicated events.
   * Result is cached until next addEvent() call.
   */
  getDeduplicated(): EventTask[]
  /**
   * Optimize patterns by merging overlapping patterns.
   *
   * Example: ['product:1', 'product:2', 'product:3'] -> ['product:*']
   */
  optimizePatterns(patterns: string[]): string[]
  /**
   * Clear the deduplication manager.
   */
  clear(): void
  /**
   * Get statistics.
   */
  getStats(): DeduplicationStats
  /**
   * Reset statistics (but keep deduplication data).
   */
  resetStats(): void
  /**
   * Get deduplication rate percentage.
   */
  getDeduplicationRate(): number
  /**
   * Get pattern count.
   */
  getPatternCount(): number
  /**
   * Get event for specific pattern.
   */
  getEventForPattern(pattern: string): EventTask | undefined
  /**
   * Check if pattern exists.
   */
  hasPattern(pattern: string): boolean
  /**
   * Remove specific pattern.
   */
  removePattern(pattern: string): boolean
  /**
   * Remove patterns by prefix.
   */
  removePatternByPrefix(prefix: string): number
  /**
   * Get all patterns.
   */
  getPatterns(): string[]
  /**
   * Find events matching invalidation pattern.
   * Supports wildcard patterns.
   */
  findEventsByPattern(invalidationPattern: string): EventTask[]
  /**
   * Shutdown the manager (cleanup resources).
   */
  shutdown(): void
  /**
   * Generate deduplication pattern from event.
   */
  private generatePattern
  /**
   * Get pattern regex (cached).
   */
  private getPatternRegex
  /**
   * Convert pattern to regex.
   */
  private patternToRegex
  /**
   * Update deduplication rate.
   */
  private updateDeduplicationRate
  /**
   * Start automatic cleanup timer.
   */
  private startCleanup
  /**
   * Stop cleanup timer.
   */
  private stopCleanup
  /**
   * Perform TTL-based cleanup.
   */
  private performCleanup
  /**
   * Internal method for testing.
   */
  __getPatternMap(): Map<string, EventTask>
}

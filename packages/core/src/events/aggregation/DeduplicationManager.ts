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
import type { AggregationConfig, DeduplicationStats, WindowAdjustmentConfig } from './types'
import { DEFAULT_AGGREGATION_CONFIG, PRIORITY_ORDER } from './types'

/**
 * Event deduplication manager using pattern matching.
 */
export class DeduplicationManager {
  // Pattern -> EventTask mapping for deduplication
  private patternMap: Map<string, EventTask> = new Map()

  // Statistics
  private stats: DeduplicationStats = {
    totalEvents: 0,
    deduplicatedEvents: 0,
    removedCount: 0,
    patternsAggregated: 0,
    deduplicationRate: 0,
  }

  // Pattern regex cache
  private regexCache = new Map<string, RegExp>()

  // Cached deduplicated result
  private cachedDeduplicated: EventTask[] | null = null
  private deduplicatedDirty = true

  // Configuration
  private config: Required<AggregationConfig>

  // TTL tracking for cleanup
  private patternTimestamps: Map<string, number> = new Map()

  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null

  /**
   * Create a deduplication manager.
   */
  constructor(config?: Partial<AggregationConfig>) {
    this.config = {
      ...DEFAULT_AGGREGATION_CONFIG,
      ...config,
    }

    if (this.config.enableCleanup) {
      this.startCleanup()
    }
  }

  /**
   * Add an event for deduplication.
   *
   * Rules:
   * 1. Events with same pattern are merged into one
   * 2. Higher priority events are kept, lower priority removed
   * 3. If new event has higher priority, it replaces old event
   */
  addEvent(event: EventTask): void {
    this.stats.totalEvents++
    this.deduplicatedDirty = true

    // Generate deduplication pattern
    const pattern = this.generatePattern(event)

    const existing = this.patternMap.get(pattern)

    if (!existing) {
      // New pattern, add directly
      this.patternMap.set(pattern, event)
      this.patternTimestamps.set(pattern, Date.now())
    } else {
      // Pattern exists, compare priorities
      const existingPriority = PRIORITY_ORDER[existing.options.priority ?? 'normal'] ?? 2
      const newPriority = PRIORITY_ORDER[event.options.priority ?? 'normal'] ?? 2

      if (newPriority < existingPriority) {
        // New event has higher priority, replace
        this.patternMap.set(pattern, event)
        this.patternTimestamps.set(pattern, Date.now())
        this.stats.removedCount++
      } else if (newPriority === existingPriority) {
        // Same priority, keep the earliest
        if (event.createdAt < existing.createdAt) {
          this.patternMap.set(pattern, event)
          this.patternTimestamps.set(pattern, Date.now())
        }
        this.stats.removedCount++
      } else {
        // Existing event has higher priority, discard new event
        this.stats.removedCount++
      }
    }

    // Update statistics
    this.stats.deduplicatedEvents = this.patternMap.size
    this.stats.patternsAggregated = this.patternMap.size
    this.updateDeduplicationRate()
  }

  /**
   * Add multiple events.
   */
  addEvents(events: EventTask[]): void {
    for (const event of events) {
      this.addEvent(event)
    }
  }

  /**
   * Get all deduplicated events.
   * Result is cached until next addEvent() call.
   */
  getDeduplicated(): EventTask[] {
    // Return cached result if valid
    if (!this.deduplicatedDirty && this.cachedDeduplicated !== null) {
      return this.cachedDeduplicated
    }

    // Build deduplication result
    const eventMap = new Map<string, EventTask>()

    for (const event of this.patternMap.values()) {
      const existing = eventMap.get(event.id)

      if (!existing) {
        // First occurrence of this event ID
        eventMap.set(event.id, { ...event })
      }
    }

    // Cache result
    this.cachedDeduplicated = Array.from(eventMap.values())
    this.deduplicatedDirty = false

    return this.cachedDeduplicated
  }

  /**
   * Optimize patterns by merging overlapping patterns.
   *
   * Example: ['product:1', 'product:2', 'product:3'] -> ['product:*']
   */
  optimizePatterns(patterns: string[]): string[] {
    if (patterns.length < 3) {
      return patterns
    }

    const optimized: string[] = []
    const byPrefix = new Map<string, string[]>()

    // Group by prefix
    for (const pattern of patterns) {
      const parts = pattern.split(':')
      const prefix = parts[0]

      if (!byPrefix.has(prefix)) {
        byPrefix.set(prefix, [])
      }
      byPrefix.get(prefix)!.push(pattern)
    }

    // If a prefix has >50% of patterns, use wildcard
    const threshold = Math.ceil(patterns.length * 0.5)

    for (const [prefix, patternList] of byPrefix.entries()) {
      if (patternList.length >= threshold) {
        // Use wildcard
        optimized.push(`${prefix}:*`)
      } else {
        // Keep original patterns
        optimized.push(...patternList)
      }
    }

    return optimized
  }

  /**
   * Clear the deduplication manager.
   */
  clear(): void {
    this.patternMap.clear()
    this.patternTimestamps.clear()
    this.cachedDeduplicated = null
    this.deduplicatedDirty = true
    this.regexCache.clear()
    this.stats.totalEvents = 0
    this.stats.deduplicatedEvents = 0
    this.stats.removedCount = 0
    this.stats.patternsAggregated = 0
    this.stats.deduplicationRate = 0
  }

  /**
   * Get statistics.
   */
  getStats(): DeduplicationStats {
    return { ...this.stats }
  }

  /**
   * Reset statistics (but keep deduplication data).
   */
  resetStats(): void {
    this.stats.totalEvents = 0
    this.stats.removedCount = 0
    this.stats.deduplicationRate = 0
    this.updateDeduplicationRate()
  }

  /**
   * Get deduplication rate percentage.
   */
  getDeduplicationRate(): number {
    return this.stats.deduplicationRate
  }

  /**
   * Get pattern count.
   */
  getPatternCount(): number {
    return this.patternMap.size
  }

  /**
   * Get event for specific pattern.
   */
  getEventForPattern(pattern: string): EventTask | undefined {
    return this.patternMap.get(pattern)
  }

  /**
   * Check if pattern exists.
   */
  hasPattern(pattern: string): boolean {
    return this.patternMap.has(pattern)
  }

  /**
   * Remove specific pattern.
   */
  removePattern(pattern: string): boolean {
    const removed = this.patternMap.delete(pattern)
    if (removed) {
      this.patternTimestamps.delete(pattern)
      this.deduplicatedDirty = true
    }
    return removed
  }

  /**
   * Remove patterns by prefix.
   */
  removePatternByPrefix(prefix: string): number {
    let removed = 0
    const toDelete: string[] = []

    for (const pattern of this.patternMap.keys()) {
      if (pattern.startsWith(prefix)) {
        toDelete.push(pattern)
      }
    }

    for (const pattern of toDelete) {
      this.patternMap.delete(pattern)
      this.patternTimestamps.delete(pattern)
      removed++
    }

    if (removed > 0) {
      this.deduplicatedDirty = true
    }

    return removed
  }

  /**
   * Get all patterns.
   */
  getPatterns(): string[] {
    return Array.from(this.patternMap.keys())
  }

  /**
   * Find events matching invalidation pattern.
   * Supports wildcard patterns.
   */
  findEventsByPattern(invalidationPattern: string): EventTask[] {
    const result: Set<EventTask> = new Set()

    // Exact match
    const exact = this.patternMap.get(invalidationPattern)
    if (exact) {
      result.add(exact)
    }

    // Wildcard match
    if (invalidationPattern.includes('*')) {
      const regex = this.getPatternRegex(invalidationPattern)
      for (const [pattern, event] of this.patternMap.entries()) {
        if (regex.test(pattern)) {
          result.add(event)
        }
      }
    }

    return Array.from(result)
  }

  /**
   * Shutdown the manager (cleanup resources).
   */
  shutdown(): void {
    this.stopCleanup()
    this.clear()
  }

  /**
   * Generate deduplication pattern from event.
   */
  private generatePattern(event: EventTask): string {
    if (this.config.deduplication === 'idempotencyKey' && event.options.idempotencyKey) {
      return `idempotency:${event.options.idempotencyKey}`
    }

    if (typeof this.config.pattern === 'function') {
      try {
        return this.config.pattern(event.args) ?? 'default'
      } catch (_e) {
        return `${event.hook}:default`
      }
    }

    if (typeof this.config.pattern === 'string') {
      // Use hook and pattern as base
      return `${event.hook}:${this.config.pattern}`
    }

    // Default: use hook as pattern
    return event.hook
  }

  /**
   * Get pattern regex (cached).
   */
  private getPatternRegex(pattern: string): RegExp {
    if (!this.regexCache.has(pattern)) {
      this.regexCache.set(pattern, this.patternToRegex(pattern))
    }
    return this.regexCache.get(pattern)!
  }

  /**
   * Convert pattern to regex.
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    return new RegExp(`^${escaped}$`)
  }

  /**
   * Update deduplication rate.
   */
  private updateDeduplicationRate(): void {
    if (this.stats.totalEvents === 0) {
      this.stats.deduplicationRate = 0
    } else {
      this.stats.deduplicationRate = Math.round(
        (this.stats.removedCount / this.stats.totalEvents) * 100
      )
    }
  }

  /**
   * Start automatic cleanup timer.
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => this.performCleanup(), this.config.cleanupIntervalMs)
  }

  /**
   * Stop cleanup timer.
   */
  private stopCleanup(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Perform TTL-based cleanup.
   */
  private performCleanup(): void {
    const now = Date.now()
    const ttl = this.config.ttlMs

    const toDelete: string[] = []
    for (const [pattern, timestamp] of this.patternTimestamps.entries()) {
      if (now - timestamp > ttl) {
        toDelete.push(pattern)
      }
    }

    for (const pattern of toDelete) {
      this.patternMap.delete(pattern)
      this.patternTimestamps.delete(pattern)
    }

    if (toDelete.length > 0) {
      this.deduplicatedDirty = true
      this.stats.deduplicatedEvents = this.patternMap.size
    }
  }

  /**
   * Internal method for testing.
   */
  __getPatternMap(): Map<string, EventTask> {
    return new Map(this.patternMap)
  }
}

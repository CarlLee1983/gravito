import type { EventOptions } from './EventOptions'

/**
 * Source of DLQ entry - reason why event entered the DLQ.
 * @public
 */
export type DLQEntrySource =
  | 'retry_exhausted'
  | 'circuit_breaker'
  | 'backpressure_overflow'
  | 'manual'

/**
 * Dead Letter Queue entry representing a failed event.
 * @public
 */
export interface DLQEntry {
  /**
   * Unique identifier for this DLQ entry.
   */
  id: string

  /**
   * Event hook name.
   */
  eventName: string

  /**
   * Event payload.
   */
  payload: unknown

  /**
   * Event options used when dispatching.
   */
  options: EventOptions

  /**
   * Error that caused the event to fail.
   */
  error: {
    message: string
    stack?: string
    code?: string
  }

  /**
   * Number of retry attempts made.
   */
  retryCount: number

  /**
   * Timestamp when the event first failed.
   */
  firstFailedAt: number

  /**
   * Timestamp when the event was added to DLQ.
   */
  failedAt: number

  /**
   * Timestamp when the event was last retried (if any).
   */
  lastRetriedAt?: number

  /**
   * Source of the DLQ entry - reason why event entered the DLQ.
   */
  source: DLQEntrySource
}

/**
 * Filter options for querying DLQ entries.
 * @public
 */
export interface DLQFilter {
  /**
   * Filter by event name.
   */
  eventName?: string

  /**
   * Filter by entries failed after this timestamp.
   */
  from?: number

  /**
   * Filter by entries failed before this timestamp.
   */
  to?: number

  /**
   * Maximum number of entries to return.
   */
  limit?: number
}

/**
 * Callback type for DLQ entry events.
 * @public
 */
export type DLQEntryCallback = (entry: DLQEntry) => void

/**
 * Dead Letter Queue Manager for handling failed events.
 *
 * The DLQ stores events that have exceeded their retry limit,
 * allowing for manual inspection, reprocessing, or analysis.
 *
 * @public
 */
export class DeadLetterQueue {
  private entries: Map<string, DLQEntry> = new Map()
  private entryIdCounter = 0
  private maxEntries?: number
  private onEntryAdded?: DLQEntryCallback
  private onEntryRemoved?: DLQEntryCallback

  /**
   * Create a new DeadLetterQueue instance.
   *
   * @param maxEntries - Maximum number of entries to keep (optional, no limit if not set)
   */
  constructor(maxEntries?: number) {
    this.maxEntries = maxEntries
  }

  /**
   * Add a failed event to the Dead Letter Queue.
   *
   * @param eventName - Name of the failed event
   * @param payload - Event payload
   * @param options - Event options
   * @param error - Error that caused the failure
   * @param retryCount - Number of retry attempts made
   * @param firstFailedAt - Timestamp of first failure
   * @param source - Source of the DLQ entry (default: 'retry_exhausted')
   * @returns DLQ entry ID
   */
  add(
    eventName: string,
    payload: unknown,
    options: EventOptions,
    error: Error,
    retryCount: number,
    firstFailedAt: number,
    source: DLQEntrySource = 'retry_exhausted'
  ): string {
    // Check capacity and evict oldest if needed
    if (this.maxEntries && this.entries.size >= this.maxEntries) {
      this.evictOldest()
    }

    const entryId = `dlq-${++this.entryIdCounter}-${Date.now()}`

    const entry: DLQEntry = {
      id: entryId,
      eventName,
      payload,
      options,
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      },
      retryCount,
      firstFailedAt,
      failedAt: Date.now(),
      source,
    }

    this.entries.set(entryId, entry)

    // Trigger callback
    this.onEntryAdded?.(entry)

    // Log DLQ entry
    console.error(
      `[DeadLetterQueue] Event "${eventName}" added to DLQ (source: ${source}) after ${retryCount} retries:`,
      error.message
    )

    return entryId
  }

  /**
   * Get a specific DLQ entry by ID.
   *
   * @param entryId - DLQ entry ID
   * @returns DLQ entry or undefined if not found
   */
  get(entryId: string): DLQEntry | undefined {
    return this.entries.get(entryId)
  }

  /**
   * List DLQ entries with optional filtering.
   *
   * @param filter - Filter options
   * @returns Array of DLQ entries
   */
  list(filter: DLQFilter = {}): DLQEntry[] {
    let entries = Array.from(this.entries.values())

    // Filter by event name
    if (filter.eventName) {
      entries = entries.filter((entry) => entry.eventName === filter.eventName)
    }

    // Filter by time range
    if (filter.from) {
      entries = entries.filter((entry) => entry.failedAt >= filter.from!)
    }

    if (filter.to) {
      entries = entries.filter((entry) => entry.failedAt <= filter.to!)
    }

    // Sort by failedAt (newest first)
    entries.sort((a, b) => b.failedAt - a.failedAt)

    // Apply limit
    if (filter.limit) {
      entries = entries.slice(0, filter.limit)
    }

    return entries
  }

  /**
   * Delete a DLQ entry.
   *
   * @param entryId - DLQ entry ID
   * @returns True if entry was deleted, false if not found
   */
  delete(entryId: string): boolean {
    const entry = this.entries.get(entryId)
    if (entry) {
      this.onEntryRemoved?.(entry)
    }
    return this.entries.delete(entryId)
  }

  /**
   * Delete all DLQ entries matching the filter.
   *
   * @param filter - Filter options
   * @returns Number of entries deleted
   */
  deleteAll(filter: DLQFilter = {}): number {
    const entriesToDelete = this.list(filter)
    let deletedCount = 0

    for (const entry of entriesToDelete) {
      if (this.delete(entry.id)) {
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * Get the total number of entries in the DLQ.
   *
   * @returns Total entry count
   */
  getCount(): number {
    return this.entries.size
  }

  /**
   * Get the count of entries for a specific event.
   *
   * @param eventName - Event name
   * @returns Entry count for the event
   */
  getCountByEvent(eventName: string): number {
    return this.list({ eventName }).length
  }

  /**
   * Clear all entries from the DLQ.
   */
  clear(): void {
    for (const entry of this.entries.values()) {
      this.onEntryRemoved?.(entry)
    }
    this.entries.clear()
  }

  /**
   * Update the last retried timestamp for an entry.
   *
   * @param entryId - DLQ entry ID
   * @internal
   */
  updateLastRetried(entryId: string): void {
    const entry = this.entries.get(entryId)
    if (entry) {
      entry.lastRetriedAt = Date.now()
    }
  }

  /**
   * Evict the oldest entry from the DLQ.
   * Used when capacity limit is reached.
   *
   * @private
   */
  private evictOldest(): void {
    let oldestEntry: DLQEntry | null = null
    let oldestId: string | null = null

    for (const [id, entry] of this.entries.entries()) {
      if (!oldestEntry || entry.failedAt < oldestEntry.failedAt) {
        oldestEntry = entry
        oldestId = id
      }
    }

    if (oldestId && oldestEntry) {
      console.warn(`[DeadLetterQueue] Capacity limit reached. Evicting oldest entry: ${oldestId}`)
      this.delete(oldestId)
    }
  }

  /**
   * Get the oldest entry in the DLQ.
   *
   * @returns Oldest DLQ entry or undefined if empty
   */
  getOldestEntry(): DLQEntry | undefined {
    let oldestEntry: DLQEntry | undefined
    let oldestTime = Infinity

    for (const entry of this.entries.values()) {
      if (entry.failedAt < oldestTime) {
        oldestEntry = entry
        oldestTime = entry.failedAt
      }
    }

    return oldestEntry
  }

  /**
   * Get the newest entry in the DLQ.
   *
   * @returns Newest DLQ entry or undefined if empty
   */
  getNewestEntry(): DLQEntry | undefined {
    let newestEntry: DLQEntry | undefined
    let newestTime = 0

    for (const entry of this.entries.values()) {
      if (entry.failedAt > newestTime) {
        newestEntry = entry
        newestTime = entry.failedAt
      }
    }

    return newestEntry
  }

  /**
   * Get all entries grouped by source.
   *
   * @param source - Source to filter by
   * @returns Array of entries matching the source
   */
  getEntriesBySource(source: DLQEntrySource): DLQEntry[] {
    return Array.from(this.entries.values()).filter((entry) => entry.source === source)
  }

  /**
   * Set callback for when an entry is added to the DLQ.
   *
   * @param callback - Callback function or undefined to clear
   */
  setOnEntryAdded(callback?: DLQEntryCallback): void {
    this.onEntryAdded = callback
  }

  /**
   * Set callback for when an entry is removed from the DLQ.
   *
   * @param callback - Callback function or undefined to clear
   */
  setOnEntryRemoved(callback?: DLQEntryCallback): void {
    this.onEntryRemoved = callback
  }

  /**
   * Get the maximum number of entries allowed in the DLQ.
   *
   * @returns Max entries limit or undefined if no limit
   */
  getMaxEntries(): number | undefined {
    return this.maxEntries
  }

  /**
   * Set the maximum number of entries allowed in the DLQ.
   *
   * @param maxEntries - Maximum entries or undefined to remove limit
   */
  setMaxEntries(maxEntries?: number): void {
    this.maxEntries = maxEntries

    // Evict oldest entries if current size exceeds new limit
    if (maxEntries && this.entries.size > maxEntries) {
      const excess = this.entries.size - maxEntries
      for (let i = 0; i < excess; i++) {
        this.evictOldest()
      }
    }
  }
}

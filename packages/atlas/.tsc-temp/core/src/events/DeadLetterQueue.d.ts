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
export declare class DeadLetterQueue {
  private entries
  private entryIdCounter
  private maxEntries?
  private onEntryAdded?
  private onEntryRemoved?
  /**
   * Create a new DeadLetterQueue instance.
   *
   * @param maxEntries - Maximum number of entries to keep (optional, no limit if not set)
   */
  constructor(maxEntries?: number)
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
    source?: DLQEntrySource
  ): string
  /**
   * Get a specific DLQ entry by ID.
   *
   * @param entryId - DLQ entry ID
   * @returns DLQ entry or undefined if not found
   */
  get(entryId: string): DLQEntry | undefined
  /**
   * List DLQ entries with optional filtering.
   *
   * @param filter - Filter options
   * @returns Array of DLQ entries
   */
  list(filter?: DLQFilter): DLQEntry[]
  /**
   * Delete a DLQ entry.
   *
   * @param entryId - DLQ entry ID
   * @returns True if entry was deleted, false if not found
   */
  delete(entryId: string): boolean
  /**
   * Delete all DLQ entries matching the filter.
   *
   * @param filter - Filter options
   * @returns Number of entries deleted
   */
  deleteAll(filter?: DLQFilter): number
  /**
   * Get the total number of entries in the DLQ.
   *
   * @returns Total entry count
   */
  getCount(): number
  /**
   * Get the count of entries for a specific event.
   *
   * @param eventName - Event name
   * @returns Entry count for the event
   */
  getCountByEvent(eventName: string): number
  /**
   * Clear all entries from the DLQ.
   */
  clear(): void
  /**
   * Update the last retried timestamp for an entry.
   *
   * @param entryId - DLQ entry ID
   * @internal
   */
  updateLastRetried(entryId: string): void
  /**
   * Evict the oldest entry from the DLQ.
   * Used when capacity limit is reached.
   *
   * @private
   */
  private evictOldest
  /**
   * Get the oldest entry in the DLQ.
   *
   * @returns Oldest DLQ entry or undefined if empty
   */
  getOldestEntry(): DLQEntry | undefined
  /**
   * Get the newest entry in the DLQ.
   *
   * @returns Newest DLQ entry or undefined if empty
   */
  getNewestEntry(): DLQEntry | undefined
  /**
   * Get all entries grouped by source.
   *
   * @param source - Source to filter by
   * @returns Array of entries matching the source
   */
  getEntriesBySource(source: DLQEntrySource): DLQEntry[]
  /**
   * Set callback for when an entry is added to the DLQ.
   *
   * @param callback - Callback function or undefined to clear
   */
  setOnEntryAdded(callback?: DLQEntryCallback): void
  /**
   * Set callback for when an entry is removed from the DLQ.
   *
   * @param callback - Callback function or undefined to clear
   */
  setOnEntryRemoved(callback?: DLQEntryCallback): void
  /**
   * Get the maximum number of entries allowed in the DLQ.
   *
   * @returns Max entries limit or undefined if no limit
   */
  getMaxEntries(): number | undefined
  /**
   * Set the maximum number of entries allowed in the DLQ.
   *
   * @param maxEntries - Maximum entries or undefined to remove limit
   */
  setMaxEntries(maxEntries?: number): void
}

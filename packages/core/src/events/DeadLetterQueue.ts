import type { EventOptions } from './EventOptions'

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

  /**
   * Add a failed event to the Dead Letter Queue.
   *
   * @param eventName - Name of the failed event
   * @param payload - Event payload
   * @param options - Event options
   * @param error - Error that caused the failure
   * @param retryCount - Number of retry attempts made
   * @param firstFailedAt - Timestamp of first failure
   * @returns DLQ entry ID
   */
  add(
    eventName: string,
    payload: unknown,
    options: EventOptions,
    error: Error,
    retryCount: number,
    firstFailedAt: number
  ): string {
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
    }

    this.entries.set(entryId, entry)

    // Log DLQ entry
    console.error(
      `[DeadLetterQueue] Event "${eventName}" added to DLQ after ${retryCount} retries:`,
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
}

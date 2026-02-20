import type { TransferFailed } from '../../domain/account/events/TransferFailed'

/**
 * Represents a record in the Dead Letter Queue (DLQ).
 */
export interface DLQRecord {
  /** Unique identifier for the failed event. */
  eventId: string
  /** The type of event that failed. */
  eventType: string
  /** The aggregate ID associated with the event. */
  aggregateId: string
  /** Reason why the event or operation failed. */
  reason: string
  /** When the failure occurred. */
  timestamp: Date
}

/**
 * Listener that captures failed operations and stores them in a Dead Letter Queue (DLQ).
 * In a production system, this would typically persist to a database or external message queue.
 *
 * Uses immutable patterns to prevent accidental mutations and support functional operations.
 */
export class DeadLetterListener {
  private dlq: DLQRecord[] = []

  /**
   * Handles a transfer failure by logging it to the DLQ.
   * Uses immutable append pattern (creates new array).
   *
   * @param event - The transfer failed domain event.
   */
  handleTransferFailed(event: TransferFailed): void {
    const newRecord: DLQRecord = {
      eventId: event.eventId,
      eventType: 'TransferFailed',
      aggregateId: event.aggregateId,
      reason: event.payload.reason,
      timestamp: event.timestamp,
    }

    // Immutable append: create new array instead of mutating
    this.dlq = [...this.dlq, newRecord]
  }

  /**
   * Retrieves all records currently in the DLQ.
   * Returns a copy to prevent external mutations.
   *
   * @returns A read-only array of DLQ records.
   */
  getDLQRecords(): readonly DLQRecord[] {
    return [...this.dlq]
  }

  /**
   * Clears all records from the DLQ using immutable pattern.
   */
  clearDLQ(): void {
    this.dlq = []
  }
}

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
 */
export class DeadLetterListener {
  private readonly dlq: DLQRecord[] = []

  /**
   * Handles a transfer failure by logging it to the DLQ.
   *
   * @param event - The transfer failed domain event.
   */
  handleTransferFailed(event: TransferFailed): void {
    this.dlq.push({
      eventId: event.eventId,
      eventType: 'TransferFailed',
      aggregateId: event.aggregateId,
      reason: event.payload.reason,
      timestamp: event.timestamp,
    })
  }

  /**
   * Retrieves all records currently in the DLQ.
   *
   * @returns An array of DLQ records.
   */
  getDLQRecords(): DLQRecord[] {
    return [...this.dlq]
  }

  /**
   * Clears all records from the DLQ.
   */
  clearDLQ(): void {
    this.dlq.length = 0
  }
}

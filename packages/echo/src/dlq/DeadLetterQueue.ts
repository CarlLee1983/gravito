import type { IncomingWebhookRecord, OutgoingWebhookRecord } from '../storage/WebhookStore'

/**
 * Defines the interface for a Dead Letter Queue (DLQ).
 * A DLQ stores webhook events that failed to be processed or delivered after all retry attempts.
 * This allows for manual inspection, debugging, and eventual re-processing of failed events.
 *
 * @example
 * ```typescript
 * const dlq: DeadLetterQueue = new MemoryDeadLetterQueue();
 * await dlq.enqueue({
 *   type: 'outgoing',
 *   originalEvent: failedRecord,
 *   failureReason: 'Connection timeout',
 *   failedAt: new Date(),
 *   retryCount: 3
 * });
 * ```
 */
export interface DeadLetterQueue {
  /**
   * Adds a failed event to the queue.
   *
   * @param event - The dead letter event to store.
   * @returns The unique identifier assigned to the event in the queue.
   * @throws {Error} If the event cannot be persisted.
   */
  enqueue(event: DeadLetterEvent): Promise<string>

  /**
   * Retrieves a list of events from the queue for inspection or processing.
   * Events are typically returned in the order they failed (FIFO).
   *
   * @param limit - The maximum number of events to retrieve.
   * @returns An array of dead letter events.
   */
  peek(limit?: number): Promise<DeadLetterEvent[]>

  /**
   * Removes an event from the queue, typically after it has been successfully re-processed.
   *
   * @param id - The unique identifier of the event to remove.
   * @throws {Error} If the event with the given ID is not found.
   */
  dequeue(id: string): Promise<void>

  /**
   * Returns the total number of events currently in the queue.
   */
  size(): Promise<number>

  /**
   * Removes all events from the queue.
   */
  clear(): Promise<void>
}

/**
 * Represents a webhook event that has failed and is stored in the DLQ.
 */
export interface DeadLetterEvent {
  /** Unique identifier for the dead letter entry. */
  id?: string
  /** Whether the failure occurred during reception or dispatch. */
  type: 'incoming' | 'outgoing'
  /** The original webhook record that failed. */
  originalEvent: IncomingWebhookRecord | OutgoingWebhookRecord
  /** A description of why the event failed. */
  failureReason: string
  /** The timestamp when the event was moved to the DLQ. */
  failedAt: Date
  /** Total number of retry attempts made before giving up. */
  retryCount: number
  /** The timestamp of the last failed retry attempt. */
  lastRetryAt?: Date
}

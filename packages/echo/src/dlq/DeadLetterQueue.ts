import type { IncomingWebhookRecord, OutgoingWebhookRecord } from '../storage/WebhookStore'

/**
 * Interface for a Dead Letter Queue (DLQ) implementation.
 *
 * A DLQ serves as a safety net for webhook events that have permanently failed
 * all processing or delivery attempts. It enables manual inspection, diagnostic
 * analysis, and eventual re-processing of high-value events that would otherwise
 * be lost due to transient or permanent failures.
 *
 * @example Inspected failed events
 * ```typescript
 * const dlq: DeadLetterQueue = new MyPersistentDlq();
 *
 * // Retrieve recent failures for manual triage
 * const failedEvents = await dlq.peek(10);
 * for (const event of failedEvents) {
 *   console.log(`Event ${event.id} failed after ${event.retryCount} attempts: ${event.failureReason}`);
 * }
 * ```
 *
 * @public
 */
export interface DeadLetterQueue {
  /**
   * Appends a permanently failed event to the queue for later inspection.
   *
   * @param event - The dead letter event metadata and original record.
   * @returns A promise resolving to a unique identifier for the event within the queue.
   * @throws {Error} If the underlying storage fails to persist the event.
   */
  enqueue(event: DeadLetterEvent): Promise<string>

  /**
   * Retrieves a snapshot of failed events from the queue without removing them.
   *
   * @param limit - Maximum number of events to retrieve (ordered by failure time).
   * @returns A collection of dead letter events.
   */
  peek(limit?: number): Promise<DeadLetterEvent[]>

  /**
   * Permanently removes an event from the queue after successful manual resolution.
   *
   * @param id - The unique identifier assigned during the `enqueue` process.
   * @throws {Error} If the event ID is invalid or not found in the queue.
   */
  dequeue(id: string): Promise<void>

  /**
   * Calculates the total number of events currently residing in the queue.
   *
   * @returns The total count of dead letter events.
   */
  size(): Promise<number>

  /**
   * Removes all events from the queue, resetting it to an empty state.
   */
  clear(): Promise<void>
}

/**
 * Metadata and payload for a failed webhook event stored in the Dead Letter Queue.
 *
 * This structure captures the complete context of a failure, including the original
 * data and the diagnostic reason for the final failure.
 *
 * @public
 */
export interface DeadLetterEvent {
  /**
   * A unique identifier for the entry within the DLQ storage.
   */
  id?: string
  /**
   * Indicates whether the failure occurred during reception or dispatch.
   */
  type: 'incoming' | 'outgoing'
  /**
   * The complete original record of the webhook at the moment of failure.
   */
  originalEvent: IncomingWebhookRecord | OutgoingWebhookRecord
  /**
   * A descriptive diagnostic message explaining why the event was sent to the DLQ.
   */
  failureReason: string
  /**
   * The exact timestamp when the event reached its maximum retry limit or terminal error.
   */
  failedAt: Date
  /**
   * The total number of automated attempts made before giving up on the event.
   */
  retryCount: number
  /**
   * The timestamp of the final attempted processing or delivery action.
   */
  lastRetryAt?: Date
}

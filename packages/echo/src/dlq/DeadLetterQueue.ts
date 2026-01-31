import type { IncomingWebhookRecord, OutgoingWebhookRecord } from '../storage/WebhookStore'

/**
 * Interface for a Dead Letter Queue (DLQ) implementation.
 *
 * A DLQ serves as a safety net for webhook events that have permanently failed
 * all processing or delivery attempts. It enables manual inspection, diagnostic
 * analysis, and eventual re-processing of high-value events that would otherwise
 * be lost.
 *
 * @example
 * ```typescript
 * const dlq: DeadLetterQueue = new MyPersistentDlq();
 *
 * // Inspect the queue
 * const failedEvents = await dlq.peek(10);
 * for (const event of failedEvents) {
 *   console.log(`Failed due to: ${event.failureReason}`);
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
   * @returns A unique identifier for the event within the queue.
   * @throws {Error} If the underlying storage fails to persist the event.
   */
  enqueue(event: DeadLetterEvent): Promise<string>

  /**
   * Retrieves a snapshot of failed events from the queue without removing them.
   *
   * @param limit - Maximum number of events to retrieve (FIFO order).
   * @returns Collection of dead letter events.
   */
  peek(limit?: number): Promise<DeadLetterEvent[]>

  /**
   * Permanently removes an event from the queue after successful resolution.
   *
   * @param id - The unique identifier assigned during enqueue.
   * @throws {Error} If the event ID is invalid or not found.
   */
  dequeue(id: string): Promise<void>

  /**
   * Calculates the total number of events currently residing in the queue.
   *
   * @returns Total count of dead letter events.
   */
  size(): Promise<number>

  /**
   * Removes all events from the queue, resetting it to an empty state.
   */
  clear(): Promise<void>
}

/**
 * Metadata and payload for a failed webhook event stored in the DLQ.
 *
 * @public
 */
export interface DeadLetterEvent {
  /**
   * Unique identifier for the dead letter entry.
   */
  id?: string
  /**
   * Direction of the webhook that failed.
   */
  type: 'incoming' | 'outgoing'
  /**
   * The complete original record of the webhook at the time of failure.
   */
  originalEvent: IncomingWebhookRecord | OutgoingWebhookRecord
  /**
   * Detailed diagnostic message describing why the event failed.
   */
  failureReason: string
  /**
   * Timestamp of when the event was officially declared "dead".
   */
  failedAt: Date
  /**
   * Number of automated retry attempts completed before queueing.
   */
  retryCount: number
  /**
   * Timestamp of the most recent delivery or processing attempt.
   */
  lastRetryAt?: Date
}

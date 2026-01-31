/**
 * Interface for the Webhook Event Storage layer.
 *
 * Implementations of this interface are responsible for providing durable
 * persistence for both incoming and outgoing webhook events, enabling audit
 * logs, reliability retries, and manual event replaying.
 *
 * @example
 * ```typescript
 * const store: WebhookStore = new MyDatabaseStore();
 *
 * // Persist a received event
 * const eventId = await store.saveIncomingEvent(event);
 * ```
 *
 * @public
 */
export interface WebhookStore {
  /**
   * Persists a record of a successfully received and verified webhook.
   *
   * @param event - Metadata and payload of the incoming event.
   * @returns A unique identifier for the stored event.
   */
  saveIncomingEvent(event: IncomingWebhookRecord): Promise<string>

  /**
   * Persists a record of a webhook that is being dispatched to a consumer.
   *
   * @param event - Metadata and payload of the outgoing event.
   * @returns A unique identifier for the stored dispatch record.
   */
  saveOutgoingEvent(event: OutgoingWebhookRecord): Promise<string>

  /**
   * Appends or updates a delivery attempt status for an outgoing webhook.
   *
   * @param id - The ID of the original outgoing record.
   * @param attempt - Detailed outcome of the delivery attempt.
   */
  updateDeliveryAttempt(id: string, attempt: DeliveryAttempt): Promise<void>

  /**
   * Retrieves a specific event record by its unique identifier.
   *
   * @param id - The unique ID assigned by the store.
   * @returns The event record if found, otherwise null.
   */
  getEvent(id: string): Promise<WebhookRecord | null>

  /**
   * Performs a filtered search across persisted webhook events.
   *
   * @param filter - Criteria for filtering events (e.g., provider, time range).
   * @returns Collection of matching webhook records.
   */
  queryEvents(filter: EventQueryFilter): Promise<WebhookRecord[]>

  /**
   * Transitions an incoming event status to 'processed' after successful handling.
   *
   * @param id - The ID of the incoming event.
   */
  markProcessed(id: string): Promise<void>

  /**
   * Records a processing failure for an incoming event.
   *
   * @param id - The ID of the incoming event.
   * @param error - Diagnostic message describing the failure.
   */
  markFailed(id: string, error: string): Promise<void>
}

/**
 * Persisted record of an incoming webhook event.
 *
 * @public
 */
export interface IncomingWebhookRecord {
  /** Unique ID assigned by the storage layer. */
  id?: string
  /** Name of the provider instance that received the event. */
  provider: string
  /** Semantic type of the event (e.g., 'customer.created'). */
  eventType: string
  /** The parsed JSON data from the webhook. */
  payload: unknown
  /** Filtered HTTP headers received with the request. */
  headers: Record<string, string | undefined>
  /** Raw unparsed request body. */
  rawBody: string
  /** Timestamp when the event was received. */
  receivedAt: Date
  /** Current lifecycle status of the event. */
  status: 'pending' | 'processed' | 'failed'
  /** Error message if processing failed. */
  processingError?: string
  /** Directionality marker for heterogeneous stores. */
  direction?: 'incoming'
}

/**
 * Persisted record of an outgoing webhook dispatch attempt.
 *
 * @public
 */
export interface OutgoingWebhookRecord {
  /** Unique ID assigned by the storage layer. */
  id?: string
  /** Target destination URL. */
  url: string
  /** Semantic name of the dispatched event. */
  event: string
  /** The JSON body sent to the consumer. */
  payload: unknown
  /** Timestamp when the dispatch was initiated. */
  createdAt: Date
  /** Current delivery status. */
  status: 'pending' | 'delivered' | 'failed'
  /** History of all delivery attempts for this dispatch. */
  attempts: DeliveryAttempt[]
  /** Directionality marker for heterogeneous stores. */
  direction?: 'outgoing'
}

/**
 * Union type representing any persisted webhook record.
 *
 * @public
 */
export type WebhookRecord = IncomingWebhookRecord | OutgoingWebhookRecord

/**
 * Metadata for a single delivery attempt to an external target.
 *
 * @public
 */
export interface DeliveryAttempt {
  /** Sequence number of the attempt (starting at 1). */
  attemptNumber: number
  /** Timestamp of when the attempt was made. */
  timestamp: Date
  /** HTTP status code returned by the destination server. */
  statusCode?: number
  /** Raw response body from the destination server. */
  responseBody?: string
  /** Error message if the attempt failed at the network level. */
  error?: string
  /** Latency of the request in milliseconds. */
  duration: number
}

/**
 * Parameters for searching and filtering persisted events.
 *
 * @public
 */
export interface EventQueryFilter {
  /** Filter by event direction. */
  direction?: 'incoming' | 'outgoing'
  /** Filter by provider instance name. */
  provider?: string
  /** Filter by semantic event type. */
  eventType?: string
  /** Filter by current event status. */
  status?: string
  /** Start of the time range for the search. */
  from?: Date
  /** End of the time range for the search. */
  to?: Date
  /** Maximum number of records to return. */
  limit?: number
  /** Number of records to skip for pagination. */
  offset?: number
}

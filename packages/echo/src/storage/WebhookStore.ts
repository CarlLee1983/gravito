/**
 * Interface for the Webhook Event Storage layer.
 *
 * Implementations of this interface are responsible for providing durable
 * persistence for both incoming and outgoing webhook events. This layer is
 * critical for:
 * - Security Auditing: Maintaining a verifiable trail of all received events.
 * - Reliability: Enabling re-dispatch of failed outgoing webhooks.
 * - Idempotency: Checking for duplicate events to prevent double-processing.
 * - Observability: Providing data for historical analysis and reporting.
 *
 * @example Implementing a custom database store
 * ```typescript
 * class MyStore implements WebhookStore {
 *   async saveIncomingEvent(event: IncomingWebhookRecord) {
 *     const id = await db.insert('webhooks').values(event).returning('id');
 *     return id;
 *   }
 *   // ... implement other methods
 * }
 * ```
 *
 * @public
 */
export interface WebhookStore {
  /**
   * Persists a record of a successfully verified incoming webhook.
   *
   * @param event - Metadata and payload of the verified incoming event.
   * @returns A promise resolving to a unique identifier for the stored event.
   */
  saveIncomingEvent(event: IncomingWebhookRecord): Promise<string>

  /**
   * Persists a record of a webhook that is being dispatched to a consumer.
   *
   * @param event - Metadata and payload of the outgoing event intent.
   * @returns A promise resolving to a unique identifier for the stored record.
   */
  saveOutgoingEvent(event: OutgoingWebhookRecord): Promise<string>

  /**
   * Updates or appends a delivery attempt result for an outgoing webhook.
   *
   * @param id - The unique ID of the original outgoing event record.
   * @param attempt - Detailed outcome of the specific delivery attempt.
   */
  updateDeliveryAttempt(id: string, attempt: DeliveryAttempt): Promise<void>

  /**
   * Retrieves a specific webhook event record by its unique identifier.
   *
   * @param id - The unique ID assigned by the storage layer.
   * @returns The event record if found, otherwise null.
   */
  getEvent(id: string): Promise<WebhookRecord | null>

  /**
   * Performs a filtered search across persisted webhook events.
   *
   * @param filter - Criteria for filtering events (e.g., provider, date range).
   * @returns A collection of matching webhook records.
   */
  queryEvents(filter: EventQueryFilter): Promise<WebhookRecord[]>

  /**
   * Transitions an incoming event status to 'processed' after successful handling.
   *
   * @param id - The unique ID of the incoming event.
   */
  markProcessed(id: string): Promise<void>

  /**
   * Records a processing failure for an incoming event with diagnostic details.
   *
   * @param id - The unique ID of the incoming event.
   * @param error - A descriptive message detailing why processing failed.
   */
  markFailed(id: string, error: string): Promise<void>
}

/**
 * Persisted representation of an authenticated incoming webhook event.
 *
 * @public
 */
export interface IncomingWebhookRecord {
  /**
   * Unique identifier assigned by the storage layer.
   */
  id?: string
  /**
   * The name of the provider instance that verified the event.
   */
  provider: string
  /**
   * The semantic type of the event (e.g., 'invoice.paid').
   */
  eventType: string
  /**
   * The parsed JSON data extracted from the verified webhook body.
   */
  payload: unknown
  /**
   * Filtered set of HTTP headers received with the original request.
   */
  headers: Record<string, string | undefined>
  /**
   * The exact unparsed request body, preserved for audit or re-verification.
   */
  rawBody: string
  /**
   * The timestamp when the event was first recorded by the system.
   */
  receivedAt: Date
  /**
   * The current stage in the event's processing lifecycle.
   */
  status: 'pending' | 'processed' | 'failed'
  /**
   * Diagnostic details provided if the status is 'failed'.
   */
  processingError?: string
  /**
   * Discriminator field used for heterogeneous storage collections.
   */
  direction?: 'incoming'
}

/**
 * Persisted representation of an outgoing webhook dispatch and its delivery status.
 *
 * @public
 */
export interface OutgoingWebhookRecord {
  /**
   * Unique identifier assigned by the storage layer.
   */
  id?: string
  /**
   * The destination URL where the webhook is being delivered.
   */
  url: string
  /**
   * The semantic name of the event being dispatched.
   */
  event: string
  /**
   * The JSON payload sent to the destination server.
   */
  payload: unknown
  /**
   * The timestamp when the dispatch operation was first initiated.
   */
  createdAt: Date
  /**
   * The overall delivery status based on attempt history.
   */
  status: 'pending' | 'delivered' | 'failed'
  /**
   * Chronological history of all delivery attempts for this dispatch.
   */
  attempts: DeliveryAttempt[]
  /**
   * Discriminator field used for heterogeneous storage collections.
   */
  direction?: 'outgoing'
}

/**
 * Union type representing any type of persisted webhook transaction.
 *
 * @public
 */
export type WebhookRecord = IncomingWebhookRecord | OutgoingWebhookRecord

/**
 * Detailed telemetry for a single HTTP delivery attempt to an external consumer.
 *
 * @public
 */
export interface DeliveryAttempt {
  /**
   * The sequence number of this attempt (starts at 1).
   */
  attemptNumber: number
  /**
   * The exact timestamp when the network request was initiated.
   */
  timestamp: Date
  /**
   * The HTTP status code returned by the destination server (if reached).
   */
  statusCode?: number
  /**
   * The raw response body returned by the target server for diagnostics.
   */
  responseBody?: string
  /**
   * The error message if the attempt failed at the network or protocol level.
   */
  error?: string
  /**
   * The total duration of the HTTP request in milliseconds.
   */
  duration: number
}

/**
 * Parameters for querying and filtering the webhook event audit log.
 *
 * @public
 */
export interface EventQueryFilter {
  /**
   * Limit search to either 'incoming' or 'outgoing' events.
   */
  direction?: 'incoming' | 'outgoing'
  /**
   * Filter by the name of the provider instance.
   */
  provider?: string
  /**
   * Filter by the semantic event type.
   */
  eventType?: string
  /**
   * Filter by current processing or delivery status.
   */
  status?: string
  /**
   * Start boundary for the search time range.
   */
  from?: Date
  /**
   * End boundary for the search time range.
   */
  to?: Date
  /**
   * Maximum number of records to return for this query.
   */
  limit?: number
  /**
   * Number of records to skip for paginated results.
   */
  offset?: number
}

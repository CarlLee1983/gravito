import type { DeadLetterQueue } from './dlq/DeadLetterQueue'
import type { EchoLogger } from './observability/logging'
import type { MetricsProvider } from './observability/metrics'
import type { Tracer } from './observability/tracing'
import type { WebhookStore } from './storage/WebhookStore'

/**
 * Core types for the Echo module.
 *
 * This module defines the fundamental structures for both receiving and sending webhooks,
 * ensuring a consistent interface across different providers and delivery targets.
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────
// Webhook Receiving
// ─────────────────────────────────────────────────────────────

/**
 * Configuration for a specific webhook provider instance.
 *
 * This interface defines the essential security and routing parameters required to
 * authenticate incoming requests from external services. It acts as a contract
 * between the Echo receiver and the specific provider implementation.
 *
 * @example
 * ```typescript
 * const stripeConfig: WebhookProviderConfig = {
 *   name: 'stripe_prod',
 *   secret: process.env.STRIPE_WEBHOOK_SECRET,
 *   signatureHeader: 'stripe-signature',
 *   tolerance: 300 // Allow for 5 minutes of clock drift
 * };
 * ```
 *
 * @public
 */
export interface WebhookProviderConfig {
  /**
   * A unique identifier for this provider configuration instance.
   * This name is used to route incoming requests to the correct security context.
   */
  name: string
  /**
   * The cryptographic shared secret used to verify request signatures.
   * Depending on the provider, this might be a signing secret or a client secret.
   */
  secret: string
  /**
   * The specific HTTP header name containing the signature.
   * If omitted, the provider's default header (e.g., 'x-hub-signature-256' for GitHub) is used.
   *
   * @example 'x-paddle-signature'
   */
  signatureHeader?: string
  /**
   * The maximum permissible age of a webhook request in seconds.
   * Used to mitigate replay attacks by ensuring the request was recently signed.
   *
   * @defaultValue 300
   */
  tolerance?: number
}

/**
 * The normalized result of a webhook authenticity and integrity check.
 *
 * This structure encapsulates the outcome of the verification process, providing
 * both the status and the extracted data needed for subsequent processing.
 *
 * @public
 */
export interface WebhookVerificationResult {
  /**
   * Indicates whether the cryptographic signature is valid and the request
   * falls within the specified time tolerance window.
   */
  valid: boolean
  /**
   * A human-readable or machine-parsable explanation of why verification failed.
   * Only populated when `valid` is false.
   */
  error?: string
  /**
   * The parsed JSON payload extracted from the validated request body.
   * Guaranteed to be available and authentic if `valid` is true.
   */
  payload?: unknown
  /**
   * The semantic category of the event (e.g., 'invoice.created').
   * Inferred by the provider implementation during verification.
   */
  eventType?: string
  /**
   * The unique ID assigned to this event by the source service.
   * Used for idempotency checks and audit logging.
   */
  webhookId?: string
}

/**
 * Contract for implementing service-specific webhook verification and parsing.
 *
 * Implementations of this interface handle the low-level, service-specific details
 * of signature algorithms (HMAC, RSA), timestamp header formats, and payload
 * structure for specific providers like Stripe, GitHub, or Shopify.
 *
 * @public
 */
export interface WebhookProvider {
  /**
   * The canonical type name of the provider.
   * This name is used to match incoming requests to the correct implementation.
   *
   * @example 'stripe'
   */
  readonly name: string

  /**
   * Validates the cryptographic integrity and temporal validity of a request.
   *
   * This method must perform signature check and timestamp validation to prevent
   * forgery and replay attacks.
   *
   * @param payload - The exact raw request body as received (crucial for HMAC).
   * @param headers - Complete HTTP headers from the incoming request.
   * @param secret - The configured secret key for the provider instance.
   * @returns A promise resolving to the verification result and parsed payload.
   * @throws {Error} Should only throw for unexpected internal errors, not for invalid signatures.
   */
  verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult>

  /**
   * Identifies the semantic event type from a validated and parsed payload.
   *
   * @param payload - The authentic data object returned by `verify`.
   * @returns The event type string (e.g., 'customer.subscription.deleted') or undefined if unrecognized.
   */
  parseEventType?(payload: unknown): string | undefined
}

/**
 * A callback function triggered when a valid webhook event is matched and processed.
 *
 * @param event - The normalized and authenticated webhook event object.
 * @public
 */
export type WebhookHandler<T = unknown> = (event: WebhookEvent<T>) => void | Promise<void>

/**
 * Normalized representation of an authenticated incoming webhook event.
 *
 * Echo transforms diverse provider-specific requests into this standard format,
 * allowing application logic to remain decoupled from the specifics of the source service.
 *
 * @example
 * ```typescript
 * const processOrder: WebhookHandler<OrderData> = async (event) => {
 *   const { provider, type, payload } = event;
 *   console.log(`Processing ${type} from ${provider}`);
 *   await updateDatabase(payload.orderId);
 * };
 * ```
 *
 * @public
 */
export interface WebhookEvent<T = unknown> {
  /**
   * The name of the provider instance that received and verified this event.
   */
  provider: string
  /**
   * The semantic category of the event (e.g., 'payment.captured').
   */
  type: string
  /**
   * The parsed and type-safe data payload.
   */
  payload: T
  /**
   * The original HTTP headers received with the request.
   */
  headers: Record<string, string | string[] | undefined>
  /**
   * The exact raw request body, preserved for audit trails or re-verification.
   */
  rawBody: string
  /**
   * The high-precision timestamp when the event was successfully processed by Echo.
   */
  receivedAt: Date
  /**
   * The unique ID assigned by the upstream service for this event.
   */
  id?: string
}

// ─────────────────────────────────────────────────────────────
// Request Buffering (Phase 1.1)
// ─────────────────────────────────────────────────────────────

/**
 * A snapshot of a raw HTTP request before body parsing occurs.
 *
 * This is used by middleware to prevent upstream body parsers from modifying the
 * raw request body, which would otherwise invalidate cryptographic signatures.
 *
 * @public
 */
export interface BufferedRequest {
  /**
   * The exact raw body as received from the socket.
   */
  rawBody: string | Buffer
  /**
   * A lazily-evaluated parsed version of the body if requested by handlers.
   */
  parsedBody?: unknown
  /**
   * The original request headers.
   */
  headers: Record<string, string | string[] | undefined>
  /**
   * The timestamp when the request entered the buffer.
   */
  bufferedAt: Date
}

/**
 * Operational settings for the request buffering mechanism.
 *
 * @public
 */
export interface RequestBufferConfig {
  /**
   * Whether to activate the buffering middleware.
   * @defaultValue true
   */
  enabled?: boolean
  /**
   * The maximum size of the request body allowed to be buffered (in bytes).
   * Prevents memory exhaustion attacks.
   * @defaultValue 10485760 (10MB)
   */
  maxBodySize?: number
  /**
   * List of MIME types that should bypass the buffering logic.
   * Useful for large file uploads or binary streams.
   * @defaultValue ['multipart/form-data', 'application/octet-stream']
   */
  skipContentTypes?: string[]
}

// ─────────────────────────────────────────────────────────────
// Circuit Breaker (Phase 2.1)
// ─────────────────────────────────────────────────────────────

/**
 * The current operational state of a circuit breaker.
 *
 * - `CLOSED`: Healthy state, allowing all requests through.
 * - `OPEN`: Failing state, blocking all requests to prevent cascading failure.
 * - `HALF_OPEN`: Recovery state, allowing a limited number of test requests.
 *
 * @public
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Resilience configuration for outgoing webhook delivery.
 *
 * Protects downstream consumers from being overwhelmed during outages and prevents
 * the dispatcher from wasting resources on doomed requests.
 *
 * @example
 * ```typescript
 * const cbConfig: CircuitBreakerConfig = {
 *   failureThreshold: 10,
 *   windowSize: 30000, // 30 seconds
 *   openTimeout: 60000 // Stay open for 1 minute
 * };
 * ```
 *
 * @public
 */
export interface CircuitBreakerConfig {
  /**
   * Whether to enable circuit breaking for the dispatcher.
   * @defaultValue true
   */
  enabled?: boolean
  /**
   * Number of consecutive failures required to trip the circuit to `OPEN`.
   * @defaultValue 5
   */
  failureThreshold?: number
  /**
   * Number of consecutive successes required in `HALF_OPEN` to return to `CLOSED`.
   * @defaultValue 2
   */
  successThreshold?: number
  /**
   * The rolling time window (in ms) within which failures are counted.
   * @defaultValue 60000 (1 minute)
   */
  windowSize?: number
  /**
   * Duration (in ms) to wait in `OPEN` state before transitioning to `HALF_OPEN`.
   * @defaultValue 30000 (30 seconds)
   */
  openTimeout?: number
  /**
   * Callback executed when the circuit trips to `OPEN`.
   */
  onOpen?: (target: string) => void
  /**
   * Callback executed when the circuit enters `HALF_OPEN` state.
   */
  onHalfOpen?: (target: string) => void
  /**
   * Callback executed when the circuit returns to `CLOSED` state.
   */
  onClose?: (target: string) => void
}

/**
 * Real-time operational metrics for a specific circuit breaker instance.
 *
 * Provides visibility into the health and traffic patterns of a downstream
 * webhook target.
 *
 * @public
 */
export interface CircuitBreakerMetrics {
  /**
   * The current state of the circuit (CLOSED, OPEN, or HALF_OPEN).
   */
  state: CircuitBreakerState
  /**
   * The total number of failed requests recorded within the current time window.
   */
  failures: number
  /**
   * The total number of successful requests recorded within the current time window.
   */
  successes: number
  /**
   * The exact time when the most recent failure occurred.
   */
  lastFailureAt?: Date
  /**
   * The exact time when the most recent success occurred.
   */
  lastSuccessAt?: Date
  /**
   * If the circuit is currently `OPEN`, this is the timestamp when it tripped.
   */
  openedAt?: Date
}

// ─────────────────────────────────────────────────────────────
// Key Rotation (Phase 3.1)
// ─────────────────────────────────────────────────────────────

/**
 * Metadata and value for a single version of a provider's secret key.
 *
 * Echo supports multiple concurrent keys per provider to facilitate zero-downtime
 * key rotation. The receiver will attempt verification with all active keys.
 *
 * @public
 */
export interface ProviderKeyEntry {
  /**
   * The raw cryptographic secret key value.
   */
  key: string
  /**
   * The timestamp when this key becomes eligible for use in verification.
   */
  activeFrom: Date
  /**
   * The timestamp when this key should no longer be used.
   * If omitted, the key remains valid indefinitely until manually removed.
   */
  expiresAt?: Date
  /**
   * Whether this key is the primary (current) secret.
   * New configurations or rotations should generally promote a new key to primary.
   */
  isPrimary: boolean
  /**
   * A unique identifier for this key version (e.g., a timestamp or serial).
   */
  version: string
}

/**
 * Policy settings for managing the lifecycle of webhook secrets.
 *
 * Key rotation allows you to replace compromised or aging secrets without
 * dropping incoming webhooks from services that may still be using the old key.
 *
 * @public
 */
export interface KeyRotationConfig {
  /**
   * Whether to enable the multi-key verification logic and rotation manager.
   * @defaultValue false
   */
  enabled?: boolean
  /**
   * Automatically purge keys that have passed their `expiresAt` date.
   * @defaultValue true
   */
  autoCleanup?: boolean
  /**
   * The duration (in ms) to keep an old key active after a new primary key is promoted.
   * Prevents race conditions during the propagation of the new secret.
   * @defaultValue 86400000 (24 hours)
   */
  gracePeriod?: number
  /**
   * An optional asynchronous function to fetch keys from an external vault (e.g., AWS Secrets Manager).
   */
  keyProvider?: (providerName: string) => Promise<ProviderKeyEntry[]>
  /**
   * Callback executed whenever a new key is successfully rotated.
   */
  onRotate?: (providerName: string, newKey: ProviderKeyEntry) => void
}

/**
 * Configuration for a provider that includes advanced key rotation settings.
 *
 * Extends the basic provider configuration with a list of historical and future keys.
 *
 * @public
 */
export interface WebhookProviderConfigWithRotation extends WebhookProviderConfig {
  /**
   * Collection of valid keys for this provider.
   */
  keys?: ProviderKeyEntry[]
  /**
   * Specific rotation overrides for this provider.
   */
  rotation?: KeyRotationConfig
}

// ─────────────────────────────────────────────────────────────
// Webhook Sending
// ─────────────────────────────────────────────────────────────

/**
 * Structure representing an intent to dispatch a webhook to an external target.
 *
 * @example
 * ```typescript
 * const payload: WebhookPayload = {
 *   url: 'https://customer-api.com/hooks',
 *   event: 'order.shipped',
 *   data: { trackingNumber: 'XYZ123' },
 *   timestamp: new Date()
 * };
 * ```
 *
 * @public
 */
export interface WebhookPayload<T = unknown> {
  /**
   * The fully-qualified destination URL for the HTTP POST request.
   */
  url: string
  /**
   * The semantic name of the event being broadcast.
   */
  event: string
  /**
   * The data payload to be serialized as JSON in the request body.
   */
  data: T
  /**
   * An optional unique ID for this specific delivery attempt (for idempotency).
   */
  id?: string
  /**
   * The timestamp when the underlying event actually occurred.
   */
  timestamp?: Date
}

/**
 * Detailed outcome of a single webhook delivery attempt.
 *
 * @public
 */
export interface WebhookDeliveryResult {
  /**
   * True if the destination server returned a success status code (2xx).
   */
  success: boolean
  /**
   * The numeric HTTP status code returned by the target server.
   */
  statusCode?: number
  /**
   * The raw response body returned by the target server.
   */
  body?: string
  /**
   * A descriptive error message if the network request or server returned an error.
   */
  error?: string
  /**
   * The sequence number of this delivery attempt (starts at 1).
   */
  attempt: number
  /**
   * Total wall-clock time taken for the HTTP request in milliseconds.
   */
  duration: number
  /**
   * The exact timestamp when this delivery result was recorded.
   */
  deliveredAt: Date
}

/**
 * Strategy settings for handling failed delivery attempts with exponential backoff.
 *
 * @public
 */
export interface RetryConfig {
  /**
   * Maximum number of times to try delivering the webhook before giving up.
   * @defaultValue 3
   */
  maxAttempts?: number
  /**
   * Initial delay (in ms) before the first retry attempt.
   * @defaultValue 1000
   */
  initialDelay?: number
  /**
   * The factor by which the delay increases after each failed attempt.
   * @defaultValue 2
   */
  backoffMultiplier?: number
  /**
   * The absolute maximum delay (in ms) between retry attempts.
   * @defaultValue 300000 (5 minutes)
   */
  maxDelay?: number
  /**
   * List of HTTP status codes that should trigger a retry attempt.
   * Codes not in this list (like 400 Bad Request) are considered terminal failures.
   *
   * @example [500, 502, 503, 504, 429]
   */
  retryableStatuses?: number[]
}

/**
 * Security and policy configuration for the outgoing webhook dispatcher.
 *
 * Use this interface to define how your application signs and delivers events
 * to external consumers, ensuring both reliability and authenticity.
 *
 * @public
 */
export interface WebhookDispatcherConfig {
  /**
   * Global secret key used to sign all outgoing webhook payloads.
   * Consumers use this to verify the request originated from your application.
   */
  secret: string
  /**
   * Custom retry policy for handling transient delivery failures.
   */
  retry?: RetryConfig
  /**
   * The maximum time (in ms) to wait for the target server to respond.
   * @defaultValue 30000
   */
  timeout?: number
  /**
   * Custom string sent in the `User-Agent` HTTP header.
   */
  userAgent?: string
  /**
   * Operational settings for the circuit breaker mechanism.
   * @since v1.1
   */
  circuitBreaker?: CircuitBreakerConfig
}

/**
 * Execution parameters for parallel or high-volume webhook dispatch operations.
 *
 * @public
 */
export interface BatchDispatchOptions {
  /**
   * The maximum number of requests to execute simultaneously.
   * Balancing performance vs. source/target rate limits.
   * @defaultValue 5
   */
  concurrency?: number
  /**
   * If true, the batch process will abort immediately if any single delivery fails.
   * @defaultValue false
   */
  stopOnFirstFailure?: boolean
}

/**
 * Detailed report of a batch dispatch operation's success and failure rates.
 *
 * @public
 */
export interface BatchDispatchResult {
  /**
   * The total number of webhook payloads processed in this batch.
   */
  total: number
  /**
   * Number of payloads that were successfully delivered (HTTP 2xx).
   */
  succeeded: number
  /**
   * Number of payloads that failed delivery after all retries.
   */
  failed: number
  /**
   * Individual delivery results mapped to their corresponding payloads.
   */
  results: Array<{
    payload: WebhookPayload
    result: WebhookDeliveryResult
  }>
}

/**
 * Filter and execution parameters for replaying historical webhook events.
 *
 * Replay is useful for testing, recovery from consumer outages, or
 * synchronizing data after a code update.
 *
 * @public
 */
export interface ReplayOptions {
  /**
   * Specific event IDs to re-send. If provided, other filters are ignored.
   */
  eventIds?: string[]
  /**
   * Temporal range for selecting events from storage.
   */
  timeRange?: {
    from: Date
    to: Date
  }
  /**
   * Limit replay to a specific provider instance.
   */
  provider?: string
  /**
   * Limit replay to a specific semantic event type.
   */
  eventType?: string
  /**
   * If true, logs the actions without actually sending any network requests.
   */
  dryRun?: boolean
  /**
   * Redirect the replayed events to a different URL instead of the original one.
   */
  targetUrl?: string
}

/**
 * Summary outcome of a mass event replay operation.
 *
 * @public
 */
export interface ReplayResult {
  /**
   * Total number of events matching the replay filters.
   */
  total: number
  /**
   * Number of events that were successfully re-dispatched.
   */
  replayed: number
  /**
   * Number of events that were intentionally skipped (e.g., due to duplicate filters).
   */
  skipped: number
  /**
   * Number of events that encountered errors during the replay attempt.
   */
  failed: number
  /**
   * Detailed audit log for each event considered in the replay.
   */
  events: Array<{
    eventId: string
    status: 'replayed' | 'skipped' | 'failed'
    result?: WebhookDeliveryResult
    error?: string
  }>
}

// ─────────────────────────────────────────────────────────────
// Echo Module Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Integration points for external monitoring and diagnostic tools.
 *
 * Echo is designed to be fully observable, allowing you to plug in
 * Prometheus, OpenTelemetry, or custom logging solutions.
 *
 * @public
 */
export interface EchoObservabilityConfig {
  /**
   * Provider for collecting counters, histograms, and health metrics.
   */
  metrics?: MetricsProvider
  /**
   * Distributed tracer for tracking the full lifecycle of a webhook request.
   */
  tracer?: Tracer
  /**
   * Logger for recording security events and operational warnings.
   */
  logger?: EchoLogger
}

/**
 * The root configuration object for the OrbitEcho module.
 *
 * This structure defines the entire security, reliability, and persistence
 * architecture for webhooks within a Gravito application.
 *
 * @example
 * ```typescript
 * const echoConfig: EchoConfig = {
 *   providers: {
 *     stripe: { name: 'stripe', secret: 'whsec_...' }
 *   },
 *   dispatcher: {
 *     secret: 'my-app-outbound-secret',
 *     retry: { maxAttempts: 5 }
 *   },
 *   store: new MyDatabaseStore(),
 *   basePath: '/v1/webhooks'
 * };
 * ```
 *
 * @public
 */
export interface EchoConfig {
  /**
   * A registry of named provider configurations for authenticating incoming events.
   */
  providers?: Record<string, WebhookProviderConfig | WebhookProviderConfigWithRotation>

  /**
   * Settings for signing and reliably delivering outgoing webhooks.
   */
  dispatcher?: WebhookDispatcherConfig

  /**
   * The root URL path where Echo will mount its internal webhook handlers.
   * @defaultValue '/webhooks'
   */
  basePath?: string

  /**
   * The persistence engine used for auditing, idempotency, and replay.
   */
  store?: WebhookStore

  /**
   * The queue implementation for handling permanently failed events.
   */
  deadLetterQueue?: DeadLetterQueue

  /**
   * Default performance and concurrency settings for bulk operations.
   */
  batch?: BatchDispatchOptions

  /**
   * Settings for metrics, tracing, and logging.
   */
  observability?: EchoObservabilityConfig

  /**
   * Advanced middleware settings for body preservation and integrity.
   * @since 1.1.0
   */
  requestBuffer?: RequestBufferConfig

  /**
   * Central policy settings for dynamic secret lifecycle management.
   * @since 1.2.0
   */
  keyRotation?: KeyRotationConfig
}

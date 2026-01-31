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
 * Configuration for a specific webhook provider.
 *
 * Defines the identity and security parameters for processing incoming webhooks
 * from external services. Echo uses this configuration to route requests to
 * the correct provider implementation and verify their authenticity.
 *
 * @example
 * ```typescript
 * const config: WebhookProviderConfig = {
 *   name: 'stripe',
 *   secret: 'whsec_...',
 *   signatureHeader: 'stripe-signature',
 *   tolerance: 300
 * };
 * ```
 *
 * @public
 */
export interface WebhookProviderConfig {
  /**
   * Unique identifier for the provider instance.
   */
  name: string
  /**
   * Shared secret key used to verify the authenticity of incoming requests.
   */
  secret: string
  /**
   * HTTP header name that contains the cryptographic signature.
   *
   * @example 'x-hub-signature-256'
   */
  signatureHeader?: string
  /**
   * Maximum allowed age of a request in seconds to prevent replay attacks.
   *
   * @defaultValue 300
   */
  tolerance?: number
}

/**
 * Result of the webhook verification process.
 *
 * Encapsulates the outcome of signature and timestamp validation, providing
 * access to the authenticated payload and metadata if successful.
 *
 * @public
 */
export interface WebhookVerificationResult {
  /**
   * Whether the signature is valid and the request is within time tolerance.
   */
  valid: boolean
  /**
   * Explanation of why verification failed, if applicable.
   */
  error?: string
  /**
   * The authenticated JSON payload extracted from the request body.
   */
  payload?: unknown
  /**
   * The semantic event name (e.g., 'user.created') derived from the payload.
   */
  eventType?: string
  /**
   * The unique identifier assigned to this webhook by the source service.
   */
  webhookId?: string
}

/**
 * Interface for implementing service-specific webhook verification logic.
 *
 * Implementations are responsible for the low-level details of parsing signatures,
 * validating timestamps, and extracting event types for specific services like
 * Stripe, GitHub, or Shopify.
 *
 * @public
 */
export interface WebhookProvider {
  /**
   * The canonical name of the provider type.
   *
   * @example 'github'
   */
  readonly name: string

  /**
   * Validates the cryptographic integrity and authenticity of a request.
   *
   * @param payload - Raw request body to be verified.
   * @param headers - HTTP headers containing signatures and timestamps.
   * @param secret - The configured secret key for this provider instance.
   * @returns Verification outcome including parsed payload.
   * @throws {Error} If verification logic fails unexpectedly.
   */
  verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult>

  /**
   * Derives the semantic event type from the validated payload.
   *
   * @param payload - Validated and parsed JSON data.
   * @returns Event type string or undefined if not identifiable.
   */
  parseEventType?(payload: unknown): string | undefined
}

/**
 * A callback function triggered when a valid webhook event is received.
 *
 * @public
 */
export type WebhookHandler<T = unknown> = (event: WebhookEvent<T>) => void | Promise<void>

/**
 * Normalized representation of an incoming webhook event.
 *
 * Echo transforms provider-specific requests into this standard format,
 * enabling handlers to process webhooks from different sources using
 * a consistent interface.
 *
 * @example
 * ```typescript
 * const handler: WebhookHandler<Stripe.Event> = async (event) => {
 *   console.log(`Received ${event.type} from ${event.provider}`);
 *   processPayload(event.payload);
 * };
 * ```
 *
 * @public
 */
export interface WebhookEvent<T = unknown> {
  /**
   * The name of the registered provider instance that received the event.
   */
  provider: string
  /**
   * The semantic type of the event (e.g., 'invoice.paid').
   */
  type: string
  /**
   * The parsed, type-safe data payload from the webhook.
   */
  payload: T
  /**
   * Original HTTP headers received with the request.
   */
  headers: Record<string, string | string[] | undefined>
  /**
   * The unparsed request body for audit or manual re-verification.
   */
  rawBody: string
  /**
   * Precision timestamp of when the event was processed by Echo.
   */
  receivedAt: Date
  /**
   * The upstream unique identifier for the event.
   */
  id?: string
}

// ─────────────────────────────────────────────────────────────
// Request Buffering (Phase 1.1)
// ─────────────────────────────────────────────────────────────

/**
 * Buffered request containing raw body before parsing.
 *
 * Prevents framework auto-parsing from breaking signature verification
 * by storing the original request body before any middleware processes it.
 *
 * @public
 */
export interface BufferedRequest {
  /**
   * Original raw body as string or Buffer.
   */
  rawBody: string | Buffer
  /**
   * Cached parsed JSON payload (lazy parsing).
   */
  parsedBody?: unknown
  /**
   * Original headers.
   */
  headers: Record<string, string | string[] | undefined>
  /**
   * Timestamp when buffered.
   */
  bufferedAt: Date
}

/**
 * Configuration for request buffering.
 *
 * @public
 */
export interface RequestBufferConfig {
  /**
   * Enable request buffering middleware.
   * @defaultValue true
   */
  enabled?: boolean
  /**
   * Maximum body size to buffer (in bytes).
   * @defaultValue 10485760 (10MB)
   */
  maxBodySize?: number
  /**
   * Skip buffering for specific content types.
   * @defaultValue ['multipart/form-data', 'application/octet-stream']
   */
  skipContentTypes?: string[]
}

// ─────────────────────────────────────────────────────────────
// Circuit Breaker (Phase 2.1)
// ─────────────────────────────────────────────────────────────

/**
 * Circuit breaker state.
 *
 * - CLOSED: Normal operation, all requests pass through
 * - OPEN: Too many failures, reject all requests immediately
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 *
 * @public
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Circuit breaker configuration.
 *
 * Protects downstream services from being overwhelmed by stopping
 * requests when failure rates exceed thresholds.
 *
 * @public
 */
export interface CircuitBreakerConfig {
  /**
   * Enable circuit breaker.
   * @defaultValue true
   */
  enabled?: boolean
  /**
   * Number of failures to trigger open state.
   * @defaultValue 5
   */
  failureThreshold?: number
  /**
   * Number of successes to close from half-open.
   * @defaultValue 2
   */
  successThreshold?: number
  /**
   * Time window in milliseconds for counting failures.
   * @defaultValue 60000 (1 minute)
   */
  windowSize?: number
  /**
   * Time to wait before attempting half-open from open.
   * @defaultValue 30000 (30 seconds)
   */
  openTimeout?: number
  /**
   * Custom error handler when circuit is open.
   */
  onOpen?: (target: string) => void
  /**
   * Custom handler when circuit transitions to half-open.
   */
  onHalfOpen?: (target: string) => void
  /**
   * Custom handler when circuit closes.
   */
  onClose?: (target: string) => void
}

/**
 * Circuit breaker metrics.
 *
 * Provides visibility into the current state and health of a circuit breaker.
 *
 * @public
 */
export interface CircuitBreakerMetrics {
  /**
   * Current state of the circuit breaker.
   */
  state: CircuitBreakerState
  /**
   * Number of failures in the current window.
   */
  failures: number
  /**
   * Number of successes in the current window.
   */
  successes: number
  /**
   * Timestamp of the last failure.
   */
  lastFailureAt?: Date
  /**
   * Timestamp of the last success.
   */
  lastSuccessAt?: Date
  /**
   * Timestamp when the circuit opened.
   */
  openedAt?: Date
}

// ─────────────────────────────────────────────────────────────
// Key Rotation (Phase 3.1)
// ─────────────────────────────────────────────────────────────

/**
 * Provider key entry with metadata.
 *
 * Represents a single version of a provider's secret key,
 * including its validity period and status.
 *
 * @public
 */
export interface ProviderKeyEntry {
  /**
   * The secret key value.
   */
  key: string
  /**
   * When this key becomes active.
   */
  activeFrom: Date
  /**
   * When this key expires (optional).
   */
  expiresAt?: Date
  /**
   * Whether this is the current primary key.
   */
  isPrimary: boolean
  /**
   * Key version or identifier.
   */
  version: string
}

/**
 * Key rotation configuration.
 *
 * Enables dynamic key rotation without application restart.
 * Supports grace periods for smooth transition between keys.
 *
 * @public
 */
export interface KeyRotationConfig {
  /**
   * Enable key rotation support.
   * @defaultValue false
   */
  enabled?: boolean
  /**
   * Automatic cleanup of expired keys.
   * @defaultValue true
   */
  autoCleanup?: boolean
  /**
   * Grace period in milliseconds to keep old keys.
   * @defaultValue 86400000 (24 hours)
   */
  gracePeriod?: number
  /**
   * Custom key provider function for dynamic fetching.
   */
  keyProvider?: (providerName: string) => Promise<ProviderKeyEntry[]>
  /**
   * Callback when key rotation occurs.
   */
  onRotate?: (providerName: string, newKey: ProviderKeyEntry) => void
}

/**
 * Extended provider config with rotation support.
 *
 * Allows configuring multiple keys for a provider to support
 * key rotation scenarios.
 *
 * @public
 */
export interface WebhookProviderConfigWithRotation extends WebhookProviderConfig {
  /**
   * Multiple keys for rotation support.
   */
  keys?: ProviderKeyEntry[]
  /**
   * Key rotation settings.
   */
  rotation?: KeyRotationConfig
}

// ─────────────────────────────────────────────────────────────
// Webhook Sending
// ─────────────────────────────────────────────────────────────

/**
 * Data structure for sending a webhook to an external service.
 *
 * @public
 */
export interface WebhookPayload<T = unknown> {
  /**
   * The destination URL where the webhook should be POSTed.
   */
  url: string
  /**
   * The name of the event being dispatched.
   */
  event: string
  /**
   * The data to be JSON-encoded and sent in the body.
   */
  data: T
  /**
   * Optional unique identifier for this specific delivery attempt.
   */
  id?: string
  /**
   * Optional timestamp representing when the event occurred.
   */
  timestamp?: Date
}

/**
 * Summary of a webhook delivery attempt.
 *
 * @public
 */
export interface WebhookDeliveryResult {
  /**
   * Indicates if the destination returned a 2xx status code.
   */
  success: boolean
  /**
   * The HTTP status code returned by the destination server.
   */
  statusCode?: number
  /**
   * The raw response body from the destination server.
   */
  body?: string
  /**
   * Error message if the request failed.
   */
  error?: string
  /**
   * Which attempt number this was.
   */
  attempt: number
  /**
   * Total time elapsed for the request in milliseconds.
   */
  duration: number
  /**
   * Timestamp when the delivery attempt was recorded.
   */
  deliveredAt: Date
}

/**
 * Strategy for retrying failed webhook deliveries with exponential backoff.
 *
 * @public
 */
export interface RetryConfig {
  /**
   * Maximum number of delivery attempts.
   * @defaultValue 3
   */
  maxAttempts?: number
  /**
   * Initial delay before the first retry in milliseconds.
   * @defaultValue 1000
   */
  initialDelay?: number
  /**
   * Multiplier for the delay between subsequent retries.
   * @defaultValue 2
   */
  backoffMultiplier?: number
  /**
   * Upper bound for the retry delay in milliseconds.
   * @defaultValue 300000
   */
  maxDelay?: number
  /**
   * List of HTTP status codes that should trigger a retry.
   *
   * @example [502, 503, 504]
   */
  retryableStatuses?: number[]
}

/**
 * Configuration for the outgoing webhook dispatcher.
 *
 * @public
 */
export interface WebhookDispatcherConfig {
  /**
   * Secret key used to sign outgoing webhook payloads for security.
   */
  secret: string
  /**
   * Optional retry strategy for failed deliveries.
   */
  retry?: RetryConfig
  /**
   * Maximum time in milliseconds to wait for a response.
   * @defaultValue 30000
   */
  timeout?: number
  /**
   * Custom User-Agent header for the outgoing request.
   */
  userAgent?: string
  /**
   * Circuit breaker configuration for protecting downstream services.
   * @since v1.1
   */
  circuitBreaker?: CircuitBreakerConfig
}

/**
 * Options for batch dispatching webhooks.
 *
 * @public
 */
export interface BatchDispatchOptions {
  /**
   * Maximum number of concurrent requests.
   * @defaultValue 5
   */
  concurrency?: number
  /**
   * Whether to stop processing on the first failure.
   * @defaultValue false
   */
  stopOnFirstFailure?: boolean
}

/**
 * Result of a batch dispatch operation.
 *
 * @public
 */
export interface BatchDispatchResult {
  /**
   * Total number of webhooks in the batch.
   */
  total: number
  /**
   * Number of successfully delivered webhooks.
   */
  succeeded: number
  /**
   * Number of failed webhooks.
   */
  failed: number
  /**
   * Individual results for each webhook.
   */
  results: Array<{
    payload: WebhookPayload
    result: WebhookDeliveryResult
  }>
}

/**
 * Options for replaying events.
 *
 * @public
 */
export interface ReplayOptions {
  /**
   * List of event IDs to replay.
   */
  eventIds?: string[]
  /**
   * Filter by time range.
   */
  timeRange?: {
    from: Date
    to: Date
  }
  /**
   * Filter by provider.
   */
  provider?: string
  /**
   * Filter by event type.
   */
  eventType?: string
  /**
   * Dry run mode (do not actually send).
   */
  dryRun?: boolean
  /**
   * Override target URL.
   */
  targetUrl?: string
}

/**
 * Result of a replay operation.
 *
 * @public
 */
export interface ReplayResult {
  /**
   * Total number of events considered for replay.
   */
  total: number
  /**
   * Number of events successfully replayed.
   */
  replayed: number
  /**
   * Number of events skipped based on filters.
   */
  skipped: number
  /**
   * Number of events that failed during replay.
   */
  failed: number
  /**
   * Detailed status for each event.
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
 * Observability configuration for Echo.
 *
 * Allows plugging in custom metrics, tracing, and logging providers
 * to monitor webhook activity.
 *
 * @public
 */
export interface EchoObservabilityConfig {
  /**
   * Metrics provider for collecting performance and error data.
   */
  metrics?: MetricsProvider
  /**
   * Distributed tracer for request tracking.
   */
  tracer?: Tracer
  /**
   * Logger for diagnostic information.
   */
  logger?: EchoLogger
}

/**
 * Complete configuration for the OrbitEcho module.
 *
 * Use this to define the security, persistence, and reliability parameters
 * for your application's webhook infrastructure.
 *
 * @example
 * ```typescript
 * const config: EchoConfig = {
 *   providers: {
 *     stripe: { name: 'stripe', secret: 'whsec_...' }
 *   },
 *   dispatcher: {
 *     secret: 'my-outgoing-secret',
 *     retry: { maxAttempts: 5 }
 *   },
 *   basePath: '/v1/webhooks'
 * };
 * ```
 *
 * @public
 */
export interface EchoConfig {
  /**
   * Registry of named provider configurations for incoming webhook processing.
   */
  providers?: Record<string, WebhookProviderConfig | WebhookProviderConfigWithRotation>

  /**
   * Configuration for outgoing webhook delivery and signing.
   */
  dispatcher?: WebhookDispatcherConfig

  /**
   * URL prefix for the automatically managed webhook endpoints.
   *
   * @defaultValue '/webhooks'
   */
  basePath?: string

  /**
   * Persistence layer for event auditing and replay capabilities.
   */
  store?: WebhookStore

  /**
   * Queue for handling events that failed all processing attempts.
   */
  deadLetterQueue?: DeadLetterQueue

  /**
   * Default execution parameters for batch webhook operations.
   */
  batch?: BatchDispatchOptions

  /**
   * Configuration for monitoring, logging, and performance tracking.
   */
  observability?: EchoObservabilityConfig

  /**
   * Advanced buffering settings for signature integrity.
   *
   * @since 1.1.0
   */
  requestBuffer?: RequestBufferConfig

  /**
   * Policy and orchestration settings for dynamic key rotation.
   *
   * @since 1.2.0
   */
  keyRotation?: KeyRotationConfig
}

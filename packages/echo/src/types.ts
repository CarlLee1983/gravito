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
 * Used to define how Echo should identify and verify incoming requests from
 * external services like Stripe, GitHub, or custom implementations.
 *
 * @public
 */
export interface WebhookProviderConfig {
  /**
   * The unique name of the provider.
   */
  name: string
  /**
   * The shared secret used to verify incoming webhook signatures.
   */
  secret: string
  /**
   * The name of the HTTP header containing the signature.
   *
   * @example 'stripe-signature'
   */
  signatureHeader?: string
  /**
   * Maximum allowed time drift in seconds for timestamp validation.
   *
   * Prevents replay attacks by ensuring the request was sent recently.
   * @defaultValue 300
   */
  tolerance?: number
}

/**
 * The result of verifying an incoming webhook request.
 *
 * Encapsulates the outcome of signature and timestamp validation,
 * providing the parsed payload if successful.
 *
 * @public
 */
export interface WebhookVerificationResult {
  /**
   * Indicates if the signature is valid and the timestamp is within tolerance.
   */
  valid: boolean
  /**
   * Descriptive error message if the verification failed.
   */
  error?: string
  /**
   * The parsed JSON payload from the request body.
   */
  payload?: unknown
  /**
   * The specific event name extracted from the payload or headers.
   */
  eventType?: string
  /**
   * The unique identifier for this webhook message, if provided by the source.
   */
  webhookId?: string
}

/**
 * Interface that all webhook provider implementations must follow.
 *
 * Providers encapsulate the service-specific logic for verifying signatures
 * and parsing event types (e.g., Stripe's HMAC-SHA256 vs GitHub's X-Hub-Signature).
 *
 * @public
 */
export interface WebhookProvider {
  /**
   * Uniquely identifies the provider type.
   *
   * @example 'stripe'
   */
  readonly name: string

  /**
   * Validates the integrity and authenticity of an incoming request.
   *
   * @param payload - The raw request body.
   * @param headers - The incoming HTTP headers.
   * @param secret - The secret key used for verification.
   * @returns A promise resolving to the verification result.
   * @throws Error if verification logic encounters an unrecoverable failure.
   */
  verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult>

  /**
   * Determines the event type from the validated payload.
   *
   * @param payload - The parsed JSON body.
   * @returns The event type string or undefined if not found.
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
 * Represents a normalized webhook event processed by Echo.
 *
 * Provides a consistent interface regardless of the source provider,
 * allowing handlers to be provider-agnostic where possible.
 *
 * @public
 */
export interface WebhookEvent<T = unknown> {
  /**
   * Name of the provider that sent the event.
   */
  provider: string
  /**
   * The type of event.
   *
   * @example 'payment_intent.succeeded'
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
   * The raw, unparsed request body string.
   */
  rawBody: string
  /**
   * The local system time when the webhook was received.
   */
  receivedAt: Date
  /**
   * Unique ID for the event, if provided by the source.
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
 * Full configuration for the OrbitEcho module.
 *
 * @public
 */
export interface EchoConfig {
  /**
   * Map of named provider configurations for receiving webhooks.
   */
  providers?: Record<string, WebhookProviderConfig>

  /**
   * Settings for sending webhooks to other services.
   */
  dispatcher?: WebhookDispatcherConfig

  /**
   * The URL prefix for the automatically generated webhook endpoints.
   *
   * @example '/webhooks' will create '/webhooks/:provider'
   * @defaultValue '/webhooks'
   */
  basePath?: string

  /**
   * Persistence store for events.
   */
  store?: WebhookStore

  /**
   * Dead letter queue for failed events.
   */
  deadLetterQueue?: DeadLetterQueue

  /**
   * Default batch dispatch options.
   */
  batch?: BatchDispatchOptions

  /**
   * Observability settings.
   */
  observability?: EchoObservabilityConfig

  /**
   * Request buffer configuration for signature verification.
   * @since v1.1
   */
  requestBuffer?: RequestBufferConfig
}

import type { DeadLetterQueue } from './dlq/DeadLetterQueue'
import type { EchoLogger } from './observability/logging'
import type { MetricsProvider } from './observability/metrics'
import type { Tracer } from './observability/tracing'
import type { WebhookStore } from './storage/WebhookStore'

/**
 * @fileoverview Core types for @gravito/echo webhook module
 * @module @gravito/echo
 */

// ─────────────────────────────────────────────────────────────
// Webhook Receiving
// ─────────────────────────────────────────────────────────────

/**
 * Configuration for a specific webhook provider (e.g., Stripe, GitHub).
 * @public
 */
export interface WebhookProviderConfig {
  /** The unique name of the provider */
  name: string
  /** The shared secret used to verify incoming webhook signatures */
  secret: string
  /** The name of the HTTP header containing the signature (e.g., 'stripe-signature') */
  signatureHeader?: string
  /** Maximum allowed time drift in seconds for timestamp validation (default: 300) */
  tolerance?: number
}

/**
 * The result of verifying an incoming webhook request.
 * @public
 */
export interface WebhookVerificationResult {
  /** True if the signature is valid and the timestamp is within tolerance */
  valid: boolean
  /** Descriptive error message if the verification failed */
  error?: string
  /** The parsed JSON payload from the request body */
  payload?: unknown
  /** The specific event name extracted from the payload or headers */
  eventType?: string
  /** The unique identifier for this webhook message, if provided by the source */
  webhookId?: string
}

/**
 * Interface that all webhook provider implementations must follow.
 * Providers handle the logic for specific services like Stripe or Shopify.
 * @public
 */
export interface WebhookProvider {
  /** Uniquely identifies the provider (e.g., 'stripe') */
  readonly name: string

  /**
   * Validates the integrity and authenticity of an incoming request.
   *
   * @param payload - The raw request body as a string or Buffer.
   * @param headers - The incoming HTTP headers.
   * @param secret - The secret key used for verification.
   */
  verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult>

  /**
   * Determines the event type from the validated payload.
   * @param payload - The parsed JSON body.
   */
  parseEventType?(payload: unknown): string | undefined
}

/**
 * A callback function triggered when a valid webhook event is received.
 * @public
 */
export type WebhookHandler<T = unknown> = (event: WebhookEvent<T>) => void | Promise<void>

/**
 * Represents a normalized webhook event processed by Echo.
 * Provides a consistent interface regardless of the source provider.
 * @public
 */
export interface WebhookEvent<T = unknown> {
  /** Name of the provider that sent the event */
  provider: string
  /** The type of event (e.g., 'payment_intent.succeeded') */
  type: string
  /** The parsed and type-safe data payload */
  payload: T
  /** The original HTTP headers received with the request */
  headers: Record<string, string | string[] | undefined>
  /** The raw, unparsed request body string */
  rawBody: string
  /** The local system time when the webhook was received */
  receivedAt: Date
  /** Unique ID for the event, if provided by the source */
  id?: string
}

// ─────────────────────────────────────────────────────────────
// Webhook Sending
// ─────────────────────────────────────────────────────────────

/**
 * Data structure for sending a webhook to an external service.
 * @public
 */
export interface WebhookPayload<T = unknown> {
  /** The destination URL where the webhook should be POSTed */
  url: string
  /** The name of the event being dispatched */
  event: string
  /** The data to be JSON-encoded and sent in the body */
  data: T
  /** Optional unique identifier for this specific delivery attempt */
  id?: string
  /** Optional timestamp representing when the event occurred */
  timestamp?: Date
}

/**
 * Summary of a webhook delivery attempt.
 * @public
 */
export interface WebhookDeliveryResult {
  /** True if the destination returned a 2xx status code */
  success: boolean
  /** The HTTP status code returned by the destination server */
  statusCode?: number
  /** The raw response body from the destination server */
  body?: string
  /** Error message if the request failed (e.g., network timeout) */
  error?: string
  /** Which attempt number this was (starts at 1) */
  attempt: number
  /** Total time elapsed for the request in milliseconds */
  duration: number
  /** Timestamp when the delivery attempt was recorded */
  deliveredAt: Date
}

/**
 * Strategy for retrying failed webhook deliveries with exponential backoff.
 * @public
 */
export interface RetryConfig {
  /** Maximum number of delivery attempts (default: 3) */
  maxAttempts?: number
  /** Initial delay before the first retry in milliseconds (default: 1000) */
  initialDelay?: number
  /** Multiplier for the delay between subsequent retries (default: 2) */
  backoffMultiplier?: number
  /** Upper bound for the retry delay in milliseconds (default: 300,000) */
  maxDelay?: number
  /** List of HTTP status codes that should trigger a retry (e.g., 502, 503) */
  retryableStatuses?: number[]
}

/**
 * Configuration for the outgoing webhook dispatcher.
 * @public
 */
export interface WebhookDispatcherConfig {
  /** Secret key used to sign outgoing webhook payloads for security */
  secret: string
  /** Optional retry strategy for failed deliveries */
  retry?: RetryConfig
  /** Maximum time in milliseconds to wait for a response (default: 30,000) */
  timeout?: number
  /** Custom User-Agent header for the outgoing request */
  userAgent?: string
}

/**
 * Options for batch dispatching webhooks
 * @public
 */
export interface BatchDispatchOptions {
  /** Maximum number of concurrent requests (default: 5) */
  concurrency?: number
  /** Whether to stop processing on the first failure (default: false) */
  stopOnFirstFailure?: boolean
}

/**
 * Result of a batch dispatch operation
 * @public
 */
export interface BatchDispatchResult {
  /** Total number of webhooks in the batch */
  total: number
  /** Number of successfully delivered webhooks */
  succeeded: number
  /** Number of failed webhooks */
  failed: number
  /** Individual results for each webhook */
  results: Array<{
    payload: WebhookPayload
    result: WebhookDeliveryResult
  }>
}

/**
 * Options for replaying events
 * @public
 */
export interface ReplayOptions {
  /** List of event IDs to replay */
  eventIds?: string[]
  /** Filter by time range */
  timeRange?: {
    from: Date
    to: Date
  }
  /** Filter by provider */
  provider?: string
  /** Filter by event type */
  eventType?: string
  /** Dry run mode (do not actually send) */
  dryRun?: boolean
  /** Override target URL */
  targetUrl?: string
}

/**
 * Result of a replay operation
 * @public
 */
export interface ReplayResult {
  total: number
  replayed: number
  skipped: number
  failed: number
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

export interface EchoObservabilityConfig {
  /** Metrics 收集器 */
  metrics?: MetricsProvider
  /** 分散式追蹤器 */
  tracer?: Tracer
  /** Logger */
  logger?: EchoLogger
}

/**
 * Full configuration for the OrbitEcho module.
 * @public
 */
export interface EchoConfig {
  /** Map of named provider configurations for receiving webhooks */
  providers?: Record<string, WebhookProviderConfig>

  /** Settings for sending webhooks to other services */
  dispatcher?: WebhookDispatcherConfig

  /**
   * The URL prefix for the automatically generated webhook endpoints.
   * (e.g., '/webhooks' will create '/webhooks/:provider')
   * Default: '/webhooks'
   */
  basePath?: string

  /** Persistence store for events */
  store?: WebhookStore

  /** Dead letter queue for failed events */
  deadLetterQueue?: DeadLetterQueue

  /** Default batch dispatch options */
  batch?: BatchDispatchOptions

  /** 可觀測性設定 */
  observability?: EchoObservabilityConfig
}

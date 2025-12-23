/**
 * @fileoverview Core types for @gravito/echo webhook module
 * @module @gravito/echo
 */

// ─────────────────────────────────────────────────────────────
// Webhook Receiving
// ─────────────────────────────────────────────────────────────

/**
 * Webhook provider configuration
 */
export interface WebhookProviderConfig {
  /** Provider name (e.g., 'stripe', 'github', 'generic') */
  name: string
  /** Secret for signature verification */
  secret: string
  /** Signature header name */
  signatureHeader?: string
  /** Timestamp validation tolerance in seconds (default: 300) */
  tolerance?: number
}

/**
 * Result of webhook verification
 */
export interface WebhookVerificationResult {
  /** Whether the webhook is valid */
  valid: boolean
  /** Error message if invalid */
  error?: string
  /** Parsed payload */
  payload?: unknown
  /** Event type (if available) */
  eventType?: string
  /** Webhook ID (if available) */
  webhookId?: string
}

/**
 * Webhook provider interface
 */
export interface WebhookProvider {
  /** Provider name */
  readonly name: string

  /**
   * Verify webhook signature
   */
  verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult>

  /**
   * Parse the event type from payload
   */
  parseEventType?(payload: unknown): string | undefined
}

/**
 * Webhook event handler
 */
export type WebhookHandler<T = unknown> = (event: WebhookEvent<T>) => void | Promise<void>

/**
 * Webhook event
 */
export interface WebhookEvent<T = unknown> {
  /** Provider name */
  provider: string
  /** Event type */
  type: string
  /** Event payload */
  payload: T
  /** Raw request headers */
  headers: Record<string, string | string[] | undefined>
  /** Raw body */
  rawBody: string
  /** Timestamp when received */
  receivedAt: Date
  /** Webhook ID (if available) */
  id?: string
}

// ─────────────────────────────────────────────────────────────
// Webhook Sending
// ─────────────────────────────────────────────────────────────

/**
 * Outgoing webhook payload
 */
export interface WebhookPayload<T = unknown> {
  /** Target URL */
  url: string
  /** Event type */
  event: string
  /** Payload data */
  data: T
  /** Optional webhook ID */
  id?: string
  /** Optional timestamp */
  timestamp?: Date
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  /** Whether delivery was successful */
  success: boolean
  /** HTTP status code */
  statusCode?: number
  /** Response body */
  body?: string
  /** Error message if failed */
  error?: string
  /** Attempt number */
  attempt: number
  /** Time taken in ms */
  duration: number
  /** Timestamp */
  deliveredAt: Date
}

/**
 * Retry strategy configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Maximum delay in ms (default: 300000 = 5 minutes) */
  maxDelay?: number
  /** HTTP status codes to retry (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatuses?: number[]
}

/**
 * Webhook dispatcher configuration
 */
export interface WebhookDispatcherConfig {
  /** Secret for signing outgoing webhooks */
  secret: string
  /** Retry configuration */
  retry?: RetryConfig
  /** Request timeout in ms (default: 30000) */
  timeout?: number
  /** User agent string */
  userAgent?: string
}

// ─────────────────────────────────────────────────────────────
// Echo Module Configuration
// ─────────────────────────────────────────────────────────────

/**
 * OrbitEcho module configuration
 */
export interface EchoConfig {
  /** Registered webhook providers */
  providers?: Record<string, WebhookProviderConfig>

  /** Dispatcher configuration for outgoing webhooks */
  dispatcher?: WebhookDispatcherConfig

  /** Base path for webhook endpoints (default: '/webhooks') */
  basePath?: string
}

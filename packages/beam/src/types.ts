import type { BeamError } from './errors'
import type { ConnectionPoolConfig } from './pool'

/**
 * Retry configuration options
 *
 * @public
 */
export interface RetryOptions {
  /**
   * Maximum number of retries, default is 0 (no retry)
   */
  count?: number

  /**
   * Retry delay (milliseconds), default is 1000
   */
  delay?: number

  /**
   * Status codes that should trigger a retry, default is [408, 429, 500, 502, 503, 504]
   */
  statusCodes?: number[]

  /**
   * Exponential backoff factor, default is 2
   */
  backoff?: number

  /**
   * Whether to add jitter (randomness) to retry delays to prevent thundering herds.
   * Default is true if retry count > 0.
   */
  jitter?: boolean

  /**
   * Whether to lazy load the retry logic.
   * Useful for minimizing bundle size if retries are rarely needed.
   */
  lazy?: boolean
}

/**
 * Offline queue configuration options
 *
 * @public
 */
export interface OfflineQueueOptions {
  /**
   * Whether to enable the offline queue
   *
   * @default false
   */
  enabled?: boolean

  /**
   * Storage engine to use for the queue
   *
   * @default 'memory'
   */
  storage?: 'memory' | 'localStorage'

  /**
   * Maximum number of requests to queue
   *
   * @default 100
   */
  maxSize?: number

  /**
   * Whether to automatically retry queued requests when the network becomes online
   *
   * @default true
   */
  retryOnReconnect?: boolean
}

/**
 * Options for the Beam (RPC) client.
 *
 * Orbit Beam uses these options to configure the underlying HTTP client.
 * It extends the standard fetch RequestInit but adds framework-specific
 * features like dynamic header resolution.
 *
 * @public
 */
export interface BeamOptions extends Omit<RequestInit, 'headers'> {
  /**
   * Custom headers to include in every request.
   *
   * Can be either:
   * - A static object: `Record<string, string>`
   * - A resolver function: `() => Record<string, string> | Promise<Record<string, string>>`
   *
   * The resolver function is useful for dynamic headers like authentication tokens
   * that may need to be refreshed or retrieved from a store.
   *
   * @example
   * ```typescript
   * headers: { 'X-Custom': 'value' }
   * ```
   *
   * @example
   * ```typescript
   * headers: () => ({ 'Authorization': `Bearer ${getToken()}` })
   * ```
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)

  /**
   * Request timeout duration (milliseconds)
   *
   * If the request exceeds this duration, it will throw a BeamTimeoutError.
   * No timeout limit by default.
   *
   * @example
   * ```typescript
   * timeout: 5000  // 5 second timeout
   * ```
   */
  timeout?: number

  /**
   * Retry configuration
   *
   * Configures automatic retry logic for transient errors (e.g., 5xx, 429, etc.)
   *
   * @example
   * ```typescript
   * retry: {
   *   count: 3,
   *   delay: 1000,
   *   statusCodes: [408, 429, 500, 502, 503, 504]
   * }
   * ```
   */
  retry?: RetryOptions

  /**
   * Enable request deduplication for GET requests
   *
   * When enabled, identical GET requests made within the deduplication window
   * will share the same underlying fetch promise, reducing redundant network calls.
   *
   * @default false
   *
   * @example
   * ```typescript
   * deduplicate: true
   * ```
   */
  deduplicate?: boolean

  /**
   * Deduplication time window (milliseconds)
   *
   * Requests are considered identical if they occur within this time window.
   * After a request completes, it's immediately removed from the cache.
   *
   * @default 1000 (1 second)
   *
   * @example
   * ```typescript
   * deduplicateWindow: 2000  // 2 second window
   * ```
   */
  deduplicateWindow?: number

  /**
   * Request interceptor
   *
   * Called before sending the request, can be used to modify request configuration (e.g., adding auth token)
   *
   * @param config - Request configuration
   * @returns Modified request configuration
   *
   * @example
   * ```typescript
   * onRequest: async (config) => {
   *   config.headers = {
   *     ...config.headers,
   *     'X-Request-ID': generateRequestId()
   *   }
   *   return config
   * }
   * ```
   */
  onRequest?: (config: RequestInit) => RequestInit | Promise<RequestInit>

  /**
   * Response interceptor
   *
   * Called after receiving the response, can be used for unified response handling (e.g., logging)
   *
   * @param response - Response object
   * @returns Original or modified response object
   *
   * @example
   * ```typescript
   * onResponse: async (response) => {
   *   console.log(`Response ${response.status} from ${response.url}`)
   *   return response
   * }
   * ```
   */
  onResponse?: (response: Response) => Response | Promise<Response>

  /**
   * Error interceptor
   *
   * Called when a request error occurs, can be used for unified error handling (e.g., error reporting)
   * Note: This interceptor will not prevent the error from being thrown; the error will still be re-thrown.
   *
   * @param error - BeamError instance
   *
   * @example
   * ```typescript
   * onError: async (error) => {
   *   await reportError(error)
   * }
   * ```
   */
  onError?: (error: BeamError) => void | Promise<void>

  /**
   * Offline queue configuration
   *
   * When enabled, requests that fail due to network errors will be queued
   * and retried when the network becomes available.
   *
   * @example
   * ```typescript
   * offlineQueue: {
   *   enabled: true,
   *   storage: 'localStorage',
   *   maxSize: 100
   * }
   * ```
   */
  offlineQueue?: OfflineQueueOptions

  /**
   * Connection pooling configuration
   *
   * Enables HTTP connection reuse across requests to the same host.
   * Reduces TCP handshake and TLS negotiation overhead for high-frequency API calls.
   *
   * When set to `true`, uses default pool configuration.
   * When set to an object, uses custom configuration.
   * When not specified, connection pooling is disabled (backward compatible).
   *
   * Pooling is most effective for:
   * - Microservices making frequent API calls to backend services
   * - Real-time applications with many concurrent requests
   * - Systems where latency is critical
   *
   * @example
   * ```typescript
   * // Enable with defaults
   * pool: true
   * ```
   *
   * @example
   * ```typescript
   * // Custom configuration
   * pool: {
   *   maxConnectionsPerHost: 10,
   *   idleTimeoutMs: 30000,
   *   metrics: true
   * }
   * ```
   */
  pool?: ConnectionPoolConfig | boolean
}

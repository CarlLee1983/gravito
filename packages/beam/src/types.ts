import type { BeamError } from './errors'

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
}

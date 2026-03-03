/**
 * RequestScope-Aware Error Handling
 *
 * Integrates RequestScope lifecycle with error handling to provide:
 * - Error context with request-scoped resources
 * - Automatic cleanup of scoped services on error
 * - Request tracing and diagnostics
 * - Resource leak detection
 */
import type { RequestScopeManager } from '../Container/RequestScopeManager'
import type { RequestScopeMetrics } from '../Container/RequestScopeMetrics'
import type { GravitoContext } from '../http/types'
/**
 * Extended error context with RequestScope information
 *
 * Provides error handlers access to request-scoped resources
 * for proper resource cleanup and error diagnostics.
 */
export interface RequestScopeErrorContext {
  /**
   * The original error that was thrown
   */
  error: unknown
  /**
   * HTTP context where error occurred
   */
  context: GravitoContext
  /**
   * RequestScope manager for this request
   * Allows error handlers to access or clean up scoped resources
   */
  scope?: RequestScopeManager
  /**
   * Metrics about the request scope state
   * Useful for diagnostics and understanding resource usage
   */
  scopeMetrics?: RequestScopeMetrics
  /**
   * Number of scoped services at time of error
   * High numbers might indicate resource leaks
   */
  scopeSize?: number
  /**
   * Request processing time in milliseconds
   * Useful for timeout errors
   */
  duration?: number
  /**
   * Additional diagnostic information
   */
  diagnostics?: {
    servicesCleanedUp?: string[]
    cleanupErrors?: Array<{
      service: string
      error: unknown
    }>
    peakMemoryMb?: number
  }
}
/**
 * Error that occurred during RequestScope cleanup
 *
 * Wraps original error with cleanup context for proper error reporting
 */
export declare class RequestScopeCleanupError extends Error {
  originalError: unknown
  cleanupErrors: Array<{
    service: string
    error: unknown
  }>
  constructor(
    message: string,
    originalError: unknown,
    cleanupErrors: Array<{
      service: string
      error: unknown
    }>
  )
}
/**
 * Helper to extract RequestScope context from GravitoContext
 *
 * @param ctx - Gravito context
 * @returns RequestScope error context with available information
 */
export declare function extractRequestScopeErrorContext(
  ctx: GravitoContext,
  error: unknown
): RequestScopeErrorContext
/**
 * Cleanup scoped services safely during error handling
 *
 * Ensures all scoped services are cleaned up even if some fail,
 * and collects cleanup errors for diagnostics.
 *
 * @param scope - RequestScope manager
 * @returns Array of cleanup errors if any occurred
 */
export declare function cleanupRequestScopeOnError(scope?: RequestScopeManager): Promise<
  Array<{
    service: string
    error: unknown
  }>
>
/**
 * Safe error handler wrapper that manages RequestScope cleanup
 *
 * Ensures scoped services are properly cleaned up before returning error response.
 * Use this to wrap error handlers to make them RequestScope-aware.
 *
 * @example
 * ```typescript
 * const errorHandler = withRequestScopeCleanup(async (ctx, error) => {
 *   // Handle error...
 *   return ctx.json({ error: error.message }, 500)
 * })
 *
 * // In your app:
 * try {
 *   // Handle request...
 * } catch (error) {
 *   return errorHandler(ctx, error)
 * }
 * ```
 */
export declare function withRequestScopeCleanup<
  T extends (ctx: GravitoContext, error: unknown) => Promise<Response>,
>(handler: T): T
/**
 * Detect potential resource leaks in RequestScope
 *
 * Returns diagnostic information about suspicious resource usage patterns
 */
export declare function detectRequestScopeLeaks(context: RequestScopeErrorContext): {
  potentialLeaks: boolean
  warnings: string[]
}

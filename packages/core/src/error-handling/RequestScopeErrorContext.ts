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
    // Services that had cleanup called
    servicesCleanedUp?: string[]
    // Services that failed cleanup
    cleanupErrors?: Array<{ service: string; error: unknown }>
    // Peak memory usage during request
    peakMemoryMb?: number
  }
}

/**
 * Error that occurred during RequestScope cleanup
 *
 * Wraps original error with cleanup context for proper error reporting
 */
export class RequestScopeCleanupError extends Error {
  constructor(
    message: string,
    public originalError: unknown,
    public cleanupErrors: Array<{ service: string; error: unknown }>
  ) {
    super(message)
    this.name = 'RequestScopeCleanupError'
  }
}

/**
 * Helper to extract RequestScope context from GravitoContext
 *
 * @param ctx - Gravito context
 * @returns RequestScope error context with available information
 */
export function extractRequestScopeErrorContext(
  ctx: GravitoContext,
  error: unknown
): RequestScopeErrorContext {
  const scope = (ctx as unknown as { _requestScope?: RequestScopeManager })._requestScope
  const metrics = scope?.getMetrics?.()
  const scopeSize = scope?.size?.()

  return {
    error,
    context: ctx,
    scope,
    scopeMetrics: metrics,
    scopeSize,
  }
}

/**
 * Cleanup scoped services safely during error handling
 *
 * Ensures all scoped services are cleaned up even if some fail,
 * and collects cleanup errors for diagnostics.
 *
 * @param scope - RequestScope manager
 * @returns Array of cleanup errors if any occurred
 */
export async function cleanupRequestScopeOnError(
  scope?: RequestScopeManager
): Promise<Array<{ service: string; error: unknown }>> {
  if (!scope) {
    return []
  }

  const errors: Array<{ service: string; error: unknown }> = []

  try {
    await scope.cleanup()
  } catch (error) {
    // Capture error but don't rethrow - we want to return error info
    errors.push({
      service: 'RequestScopeManager',
      error,
    })
  }

  return errors
}

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
export function withRequestScopeCleanup<
  T extends (ctx: GravitoContext, error: unknown) => Promise<Response>,
>(handler: T): T {
  return (async (ctx: GravitoContext, error: unknown): Promise<Response> => {
    const scope = (ctx as unknown as { _requestScope?: RequestScopeManager })._requestScope
    // Ensure scoped resources are cleaned up before error handler completes
    // Errors during cleanup are logged but don't prevent error response
    void (await cleanupRequestScopeOnError(scope))

    try {
      // Call original error handler
      return await handler(ctx, error)
    } catch (handlerError) {
      // If error handler itself fails, at least we tried to cleanup
      console.error('Error handler failed after RequestScope cleanup:', handlerError)
      throw handlerError
    }
  }) as T
}

/**
 * Detect potential resource leaks in RequestScope
 *
 * Returns diagnostic information about suspicious resource usage patterns
 */
export function detectRequestScopeLeaks(context: RequestScopeErrorContext): {
  potentialLeaks: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  // High service count might indicate services not being cleaned up properly
  if ((context.scopeSize ?? 0) > 100) {
    warnings.push(
      `High service count in scope: ${context.scopeSize}. ` +
        `Potential resource leak or accumulation.`
    )
  }

  // Long cleanup time might indicate slow cleanup handlers
  if ((context.scopeMetrics?.getCleanupDuration() ?? 0) > 100) {
    warnings.push(
      `Slow RequestScope cleanup: ${context.scopeMetrics?.getCleanupDuration()}ms. ` +
        `Check for blocking operations in cleanup() methods.`
    )
  }

  // Cleanup errors indicate failed resource cleanup
  if ((context.diagnostics?.cleanupErrors?.length ?? 0) > 0) {
    warnings.push(
      `${context.diagnostics?.cleanupErrors?.length} cleanup errors occurred. ` +
        `Check error details for resource leak details.`
    )
  }

  return {
    potentialLeaks: warnings.length > 0,
    warnings,
  }
}

/**
 * RequestScopeMetrics - Observability for RequestScope lifecycle
 *
 * Tracks cleanup execution time, scope size, and service counts
 * for performance monitoring and diagnostics.
 *
 * @example
 * ```typescript
 * const metrics = new RequestScopeMetrics()
 * metrics.recordCleanupStart()
 * await scope.cleanup()
 * metrics.recordCleanupEnd()
 *
 * console.log(metrics.toJSON())
 * // { cleanupDuration: 2.5, scopeSize: 3, servicesCleaned: 3 }
 * ```
 */
export declare class RequestScopeMetrics {
  private cleanupStartTime
  private cleanupDuration
  private scopeSize
  private servicesCleaned
  private errorsOccurred
  /**
   * Record start of cleanup operation
   */
  recordCleanupStart(): void
  /**
   * Record end of cleanup operation
   *
   * @param scopeSize - Number of services in the scope
   * @param servicesCleaned - Number of services that had cleanup called
   * @param errorsOccurred - Number of cleanup errors
   */
  recordCleanupEnd(scopeSize: number, servicesCleaned: number, errorsOccurred?: number): void
  /**
   * Get cleanup duration in milliseconds
   *
   * @returns Duration in ms, or null if cleanup not completed
   */
  getCleanupDuration(): number | null
  /**
   * Check if cleanup took longer than threshold (default 2ms)
   * Useful for detecting slow cleanups
   *
   * @param thresholdMs - Threshold in milliseconds
   * @returns True if cleanup exceeded threshold
   */
  isSlowCleanup(thresholdMs?: number): boolean
  /**
   * Export metrics as JSON for logging/monitoring
   */
  toJSON(): {
    cleanupDuration: number
    scopeSize: number
    servicesCleaned: number
    errorsOccurred: number
    hasErrors: boolean
    isSlowCleanup: boolean
  }
  /**
   * Export metrics as compact string for logging
   */
  toString(): string
}
/**
 * RequestScopeObserver - Hook for monitoring RequestScope lifecycle
 *
 * Implement this interface to receive callbacks during scope operations
 */
export interface RequestScopeObserver {
  /**
   * Called when a service is resolved in the scope
   */
  onServiceResolved?(key: string | symbol, isFromCache: boolean): void
  /**
   * Called when cleanup starts
   */
  onCleanupStart?(): void
  /**
   * Called when cleanup completes
   */
  onCleanupEnd?(metrics: RequestScopeMetrics): void
  /**
   * Called when cleanup encounters an error
   */
  onCleanupError?(error: Error): void
}
/**
 * RequestScopeMetricsCollector - Aggregates metrics across multiple scopes
 *
 * Used for application-level monitoring and performance tracking
 *
 * @example
 * ```typescript
 * const collector = new RequestScopeMetricsCollector()
 *
 * // Record metrics from multiple requests
 * collector.record(metrics1)
 * collector.record(metrics2)
 * collector.record(metrics3)
 *
 * // Get aggregated stats
 * const stats = collector.getStats()
 * console.log(stats.averageCleanupTime) // 3.5ms
 * ```
 */
export declare class RequestScopeMetricsCollector {
  private metrics
  /**
   * Record metrics from a request scope
   */
  record(metrics: RequestScopeMetrics): void
  /**
   * Get aggregated statistics
   */
  getStats(): {
    count: number
    averageCleanupTime: number
    maxCleanupTime: number
    minCleanupTime: number
    totalErrorCount: number
    errorRate: number
  }
  /**
   * Clear collected metrics
   */
  clear(): void
  /**
   * Get number of recorded metrics
   */
  size(): number
  /**
   * Export metrics as JSON array
   */
  toJSON(): {
    cleanupDuration: number
    scopeSize: number
    servicesCleaned: number
    errorsOccurred: number
    hasErrors: boolean
    isSlowCleanup: boolean
  }[]
}

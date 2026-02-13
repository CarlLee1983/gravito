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
export class RequestScopeMetrics {
  private cleanupStartTime: number | null = null
  private cleanupDuration: number | null = null
  private scopeSize = 0
  private servicesCleaned = 0
  private errorsOccurred = 0

  /**
   * Record start of cleanup operation
   */
  recordCleanupStart(): void {
    this.cleanupStartTime = performance.now()
  }

  /**
   * Record end of cleanup operation
   *
   * @param scopeSize - Number of services in the scope
   * @param servicesCleaned - Number of services that had cleanup called
   * @param errorsOccurred - Number of cleanup errors
   */
  recordCleanupEnd(scopeSize: number, servicesCleaned: number, errorsOccurred = 0): void {
    if (this.cleanupStartTime !== null) {
      this.cleanupDuration = performance.now() - this.cleanupStartTime
      this.cleanupStartTime = null
    }

    this.scopeSize = scopeSize
    this.servicesCleaned = servicesCleaned
    this.errorsOccurred = errorsOccurred
  }

  /**
   * Get cleanup duration in milliseconds
   *
   * @returns Duration in ms, or null if cleanup not completed
   */
  getCleanupDuration(): number | null {
    return this.cleanupDuration
  }

  /**
   * Check if cleanup took longer than threshold (default 2ms)
   * Useful for detecting slow cleanups
   *
   * @param thresholdMs - Threshold in milliseconds
   * @returns True if cleanup exceeded threshold
   */
  isSlowCleanup(thresholdMs = 2): boolean {
    if (this.cleanupDuration === null) return false
    return this.cleanupDuration > thresholdMs
  }

  /**
   * Export metrics as JSON for logging/monitoring
   */
  toJSON() {
    return {
      cleanupDuration: this.cleanupDuration,
      scopeSize: this.scopeSize,
      servicesCleaned: this.servicesCleaned,
      errorsOccurred: this.errorsOccurred,
      hasErrors: this.errorsOccurred > 0,
      isSlowCleanup: this.isSlowCleanup(),
    }
  }

  /**
   * Export metrics as compact string for logging
   */
  toString(): string {
    const duration = this.cleanupDuration ?? 'pending'
    return (
      `cleanup: ${duration}ms, ` +
      `scope: ${this.scopeSize}, ` +
      `cleaned: ${this.servicesCleaned}, ` +
      `errors: ${this.errorsOccurred}`
    )
  }
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
export class RequestScopeMetricsCollector {
  private metrics: RequestScopeMetrics[] = []

  /**
   * Record metrics from a request scope
   */
  record(metrics: RequestScopeMetrics): void {
    this.metrics.push(metrics)
  }

  /**
   * Get aggregated statistics
   */
  getStats() {
    if (this.metrics.length === 0) {
      return {
        count: 0,
        averageCleanupTime: null,
        maxCleanupTime: null,
        minCleanupTime: null,
        totalErrorCount: 0,
        errorRate: 0,
      }
    }

    const durations = this.metrics
      .map((m) => m.getCleanupDuration())
      .filter((d): d is number => d !== null)

    const errorCounts = this.metrics.map((m) => m.toJSON().errorsOccurred)
    const totalErrors = errorCounts.reduce((a, b) => a + b, 0)

    return {
      count: this.metrics.length,
      averageCleanupTime:
        durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : null,
      maxCleanupTime: durations.length > 0 ? Math.max(...durations) : null,
      minCleanupTime: durations.length > 0 ? Math.min(...durations) : null,
      totalErrorCount: totalErrors,
      errorRate: totalErrors / this.metrics.length,
    }
  }

  /**
   * Clear collected metrics
   */
  clear(): void {
    this.metrics = []
  }

  /**
   * Get number of recorded metrics
   */
  size(): number {
    return this.metrics.length
  }

  /**
   * Export metrics as JSON array
   */
  toJSON() {
    return this.metrics.map((m) => m.toJSON())
  }
}

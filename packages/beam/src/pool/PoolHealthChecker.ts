/**
 * @fileoverview Health checker for connection pool maintenance
 * @module @gravito/beam/pool
 */

/**
 * Health checker for connection pools
 *
 * Periodically verifies that idle connections are still alive and
 * removes stale or expired connections from the pool.
 */
export class PoolHealthChecker {
  private timer: ReturnType<typeof setInterval> | null = null

  /**
   * Create a health checker
   *
   * @param checkCallback - Called to check and clean idle connections
   * @param intervalMs - Check interval in milliseconds
   */
  constructor(
    private readonly checkCallback: () => number,
    private readonly intervalMs: number = 60000
  ) {}

  /**
   * Start periodic health checks
   *
   * Calls the check callback at regular intervals.
   */
  start(): void {
    if (this.timer !== null) {
      return
    }

    this.timer = setInterval(() => {
      try {
        this.check()
      } catch (error) {
        console.error('Error during pool health check:', error)
      }
    }, this.intervalMs)

    // Unref the timer so it doesn't prevent process exit
    this.timer.unref?.()
  }

  /**
   * Stop periodic health checks
   */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * Perform a manual health check
   *
   * @returns Number of connections removed
   */
  check(): number {
    return this.checkCallback()
  }

  /**
   * Check if health checker is running
   */
  isRunning(): boolean {
    return this.timer !== null
  }
}

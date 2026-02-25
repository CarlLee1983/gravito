/**
 * Sliding window rate limiter for per-queue message throughput control.
 *
 * Implements token depletion: allows max N messages within a rolling duration window.
 * Uses a sliding window counter algorithm for memory efficiency.
 *
 * @public
 */
export class RateLimiter {
  private windowStates = new Map<string, { timestamps: number[]; windowStart: number }>()
  private hitCount = new Map<string, { allowed: number; denied: number }>()

  /**
   * Check if a message should be allowed based on rate limit config.
   * @returns true if allowed, false if exceeds limit
   */
  check(queue: string, config: { max: number; duration: number }): boolean {
    const now = Date.now()

    // Initialize or get window state
    let state = this.windowStates.get(queue)
    if (!state) {
      state = { timestamps: [], windowStart: now }
      this.windowStates.set(queue, state)
    }

    // Prune expired timestamps outside the window
    const windowStart = now - config.duration
    state.timestamps = state.timestamps.filter((ts) => ts >= windowStart)

    // Check if we can allow this message
    const allowed = state.timestamps.length < config.max

    if (allowed) {
      state.timestamps.push(now)
      this.recordHit(queue, true)
    } else {
      this.recordHit(queue, false)
    }

    return allowed
  }

  /**
   * Get current rate limit state for a queue.
   */
  getState(queue: string): {
    queue: string
    allowed: number
    remaining: number
    resetAt: number
    windowStart: number
  } {
    const state = this.windowStates.get(queue)
    if (!state) {
      return {
        queue,
        allowed: 0,
        remaining: 0,
        resetAt: 0,
        windowStart: 0,
      }
    }

    return {
      queue,
      allowed: state.timestamps.length,
      remaining: Math.max(0, 0), // Will be set based on config in caller
      resetAt: state.timestamps.length > 0 ? state.timestamps[0]! : Date.now(),
      windowStart: state.windowStart,
    }
  }

  /**
   * Get rate limit hit statistics for a queue.
   */
  getStats(queue: string): { allowed: number; denied: number } {
    return (
      this.hitCount.get(queue) ?? {
        allowed: 0,
        denied: 0,
      }
    )
  }

  /**
   * Get statistics for all queues.
   */
  getAllStats(): Record<string, { allowed: number; denied: number }> {
    const result: Record<string, { allowed: number; denied: number }> = {}
    for (const [queue, stats] of this.hitCount.entries()) {
      result[queue] = { ...stats }
    }
    return result
  }

  /**
   * Reset rate limiter for a specific queue or all queues.
   */
  reset(queue?: string): void {
    if (queue) {
      this.windowStates.delete(queue)
      this.hitCount.delete(queue)
    } else {
      this.windowStates.clear()
      this.hitCount.clear()
    }
  }

  /**
   * Internal: Record rate limit hit/deny.
   */
  private recordHit(queue: string, allowed: boolean): void {
    let stats = this.hitCount.get(queue)
    if (!stats) {
      stats = { allowed: 0, denied: 0 }
      this.hitCount.set(queue, stats)
    }

    if (allowed) {
      stats.allowed++
    } else {
      stats.denied++
    }
  }
}

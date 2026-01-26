export interface MemoryOptions {
  maxHistorySize: number // 歷史記錄上限
  maxPayloadSize: number // 單一 payload 大小上限 (bytes)
  samplingRate: number // 抽樣率 (0-1)，1 = 全部記錄
  samplingThreshold: number // 啟用抽樣的流量閾值 (events/sec)
}

/**
 * LogSampler implements adaptive log sampling for high-traffic scenarios.
 * When event rate exceeds threshold, it randomly samples logs based on configured rate.
 *
 * @example
 * ```typescript
 * const sampler = new LogSampler()
 * const options = {
 *   maxHistorySize: 500,
 *   maxPayloadSize: 10240,
 *   samplingRate: 0.1,
 *   samplingThreshold: 1000
 * }
 *
 * if (sampler.shouldLog(options)) {
 *   // Log this event
 * }
 * ```
 */
export class LogSampler {
  private eventCount = 0
  private lastReset = Date.now()

  /**
   * Determines if the current event should be logged based on traffic rate.
   *
   * @param options - Memory configuration options
   * @returns true if event should be logged, false if it should be dropped
   */
  shouldLog(options: MemoryOptions): boolean {
    this.eventCount++

    const elapsed = Date.now() - this.lastReset

    // Reset counter every second
    if (elapsed >= 1000) {
      const rate = this.eventCount / (elapsed / 1000)
      this.eventCount = 0
      this.lastReset = Date.now()

      // If rate exceeds threshold, apply sampling
      if (rate > options.samplingThreshold) {
        return Math.random() < options.samplingRate
      }
    }

    // Below threshold, log everything
    return true
  }

  /**
   * Get current event rate (events per second)
   */
  getCurrentRate(): number {
    const elapsed = Date.now() - this.lastReset
    if (elapsed === 0) return 0
    return this.eventCount / (elapsed / 1000)
  }

  /**
   * Reset internal counters
   */
  reset(): void {
    this.eventCount = 0
    this.lastReset = Date.now()
  }
}

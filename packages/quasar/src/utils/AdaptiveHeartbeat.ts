export interface HeartbeatOptions {
  baseInterval: number
  minInterval: number
  maxInterval: number
  jitter: number
  backoffMultiplier: number
}

export class AdaptiveHeartbeat {
  private currentInterval: number
  private consecutiveFailures = 0
  private timer: Timer | null = null
  private isRunning = false

  constructor(
    private callback: () => Promise<void>,
    private options: HeartbeatOptions = {
      baseInterval: 10000,
      minInterval: 5000,
      maxInterval: 60000,
      jitter: 0.1,
      backoffMultiplier: 1.5,
    }
  ) {
    this.currentInterval = this.options.baseInterval
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.scheduleNext()
  }

  stop() {
    this.isRunning = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /**
   * Update the base interval at runtime.
   *
   * Resets the current interval to the new base value. The adaptive mechanism
   * will continue to adjust from this new baseline.
   *
   * @param newInterval - The new base interval in milliseconds.
   * @since 9.0.0
   *
   * @example
   * ```typescript
   * heartbeat.updateInterval(5000);
   * ```
   */
  updateInterval(newInterval: number) {
    this.options.baseInterval = newInterval
    this.currentInterval = newInterval
  }

  private scheduleNext() {
    if (!this.isRunning) return

    const interval = this.applyJitter(this.calculateNextInterval())

    this.timer = setTimeout(async () => {
      try {
        await this.callback()
        this.recordSuccess()
      } catch {
        this.recordFailure()
      } finally {
        this.scheduleNext()
      }
    }, interval)
  }

  private recordSuccess() {
    this.consecutiveFailures = 0
    this.currentInterval = Math.max(
      this.options.baseInterval,
      this.currentInterval / this.options.backoffMultiplier
    )
  }

  private recordFailure() {
    this.consecutiveFailures++
    this.currentInterval = Math.min(
      this.options.maxInterval,
      this.currentInterval * this.options.backoffMultiplier
    )
  }

  private calculateNextInterval(): number {
    return this.currentInterval
  }

  private applyJitter(interval: number): number {
    const jitter = interval * this.options.jitter
    return interval + (Math.random() * 2 - 1) * jitter
  }
}

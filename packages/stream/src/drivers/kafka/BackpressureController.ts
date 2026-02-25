import type { BackpressureConfig } from './types'

/**
 * Monitors buffer watermarks and signals pause/resume to the Kafka consumer.
 *
 * Decoupled from KafkaDriver to enable independent testing and reuse.
 * Uses callback pattern for minimal overhead.
 *
 * @public
 */
export class BackpressureController {
  private readonly highWatermark: number
  private readonly lowWatermark: number
  private readonly maxInFlight: number
  private paused = false
  private inFlightCount = 0
  private onPause: ((topics: string[]) => void) | null = null
  private onResume: ((topics: string[]) => void) | null = null

  constructor(
    private readonly bufferSize: number,
    config: BackpressureConfig = {}
  ) {
    this.highWatermark = config.highWatermark ?? 0.8
    this.lowWatermark = config.lowWatermark ?? 0.5
    this.maxInFlight = config.maxInFlight ?? 10

    if (this.highWatermark <= this.lowWatermark) {
      throw new Error(
        'highWatermark must be greater than lowWatermark'
      )
    }
  }

  /**
   * Register pause/resume callbacks.
   */
  onBackpressure(callbacks: {
    pause: (topics: string[]) => void
    resume: (topics: string[]) => void
  }): void {
    this.onPause = callbacks.pause
    this.onResume = callbacks.resume
  }

  /**
   * Check if a topic should be paused based on buffer level.
   */
  shouldPause(bufferLength: number): boolean {
    const threshold = this.bufferSize * this.highWatermark
    return bufferLength >= threshold && !this.paused
  }

  /**
   * Check if a topic should be resumed based on buffer level.
   */
  shouldResume(bufferLength: number): boolean {
    const threshold = this.bufferSize * this.lowWatermark
    return bufferLength <= threshold && this.paused
  }

  /**
   * Acquire a slot for in-flight callback processing.
   * Returns false if max in-flight limit reached.
   */
  acquireSlot(): boolean {
    if (this.inFlightCount >= this.maxInFlight) {
      return false
    }
    this.inFlightCount++
    return true
  }

  /**
   * Release a slot after callback processing completes.
   */
  releaseSlot(): void {
    if (this.inFlightCount > 0) {
      this.inFlightCount--
    }
  }

  /**
   * Evaluate backpressure for a topic and trigger callbacks if needed.
   */
  evaluate(bufferLength: number, topics: string[]): void {
    if (this.shouldPause(bufferLength)) {
      this.paused = true
      if (this.onPause) {
        this.onPause(topics)
      }
    } else if (this.shouldResume(bufferLength)) {
      this.paused = false
      if (this.onResume) {
        this.onResume(topics)
      }
    }
  }

  /**
   * Check if consumer is currently paused.
   */
  isPaused(): boolean {
    return this.paused
  }

  /**
   * Get current in-flight callback count.
   */
  getInFlightCount(): number {
    return this.inFlightCount
  }

  /**
   * Reset state (for cleanup/testing).
   */
  reset(): void {
    this.paused = false
    this.inFlightCount = 0
  }
}

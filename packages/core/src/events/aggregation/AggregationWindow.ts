/**
 * Aggregation window with backpressure awareness (FS-102)
 *
 * Adjusts batching window based on backpressure state:
 * - NORMAL: 200ms (optimal aggregation)
 * - WARNING: 150ms (accelerate processing)
 * - CRITICAL: 100ms (fast drain)
 * - OVERFLOW: 50ms (minimum latency)
 */

import { BackpressureState } from '../BackpressureManager'
import type { WindowStats } from './types'
import { DEFAULT_WINDOW_ADJUSTMENT } from './types'

/**
 * Aggregation window manager with backpressure awareness.
 */
export class AggregationWindow {
  // Current window size (ms)
  private currentWindowMs: number

  // Minimum and maximum bounds
  private readonly minWindowMs: number = 50
  private readonly maxWindowMs: number = 500

  // Adjustment statistics
  private stats = {
    adjustmentCount: 0,
    lastAdjustmentReason: '' as string | undefined,
  }

  /**
   * Create an aggregation window.
   *
   * @param initialWindowMs - Initial window size (default 200ms)
   */
  constructor(initialWindowMs = 200) {
    this.currentWindowMs = Math.max(this.minWindowMs, Math.min(this.maxWindowMs, initialWindowMs))
  }

  /**
   * Adjust window based on backpressure state.
   *
   * @param state - Current backpressure state
   */
  adjustWindow(state: BackpressureState): number {
    const oldWindow = this.currentWindowMs
    let newWindow = this.currentWindowMs
    let reason = 'unknown'

    switch (state) {
      case BackpressureState.NORMAL:
        newWindow = DEFAULT_WINDOW_ADJUSTMENT.normalMs
        reason = 'normal_backpressure'
        break
      case BackpressureState.WARNING:
        newWindow = DEFAULT_WINDOW_ADJUSTMENT.warningMs
        reason = 'warning_backpressure'
        break
      case BackpressureState.CRITICAL:
        newWindow = DEFAULT_WINDOW_ADJUSTMENT.criticalMs
        reason = 'critical_backpressure'
        break
      case BackpressureState.OVERFLOW:
        newWindow = DEFAULT_WINDOW_ADJUSTMENT.overflowMs
        reason = 'overflow_backpressure'
        break
      default:
        reason = `unknown_state_${String(state)}`
    }

    // Ensure bounds
    newWindow = Math.max(this.minWindowMs, Math.min(this.maxWindowMs, newWindow))

    // Update if changed
    if (newWindow !== oldWindow) {
      this.currentWindowMs = newWindow
      this.stats.adjustmentCount++
      this.stats.lastAdjustmentReason = `${reason} (${oldWindow}ms → ${newWindow}ms)`
    }

    return this.currentWindowMs
  }

  /**
   * Get current window size.
   */
  getCurrentWindow(): number {
    return this.currentWindowMs
  }

  /**
   * Get minimum window size.
   */
  getMinWindow(): number {
    return this.minWindowMs
  }

  /**
   * Get maximum window size.
   */
  getMaxWindow(): number {
    return this.maxWindowMs
  }

  /**
   * Get statistics.
   */
  getStats(): WindowStats {
    return {
      currentWindowMs: this.currentWindowMs,
      minWindowMs: this.minWindowMs,
      maxWindowMs: this.maxWindowMs,
      lastAdjustmentReason: this.stats.lastAdjustmentReason,
      adjustmentCount: this.stats.adjustmentCount,
    }
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.stats.adjustmentCount = 0
    this.stats.lastAdjustmentReason = undefined
  }

  /**
   * Reset window to initial size.
   */
  reset(windowMs?: number): void {
    this.currentWindowMs = Math.max(
      this.minWindowMs,
      Math.min(this.maxWindowMs, windowMs ?? DEFAULT_WINDOW_ADJUSTMENT.normalMs)
    )
    this.resetStats()
  }
}

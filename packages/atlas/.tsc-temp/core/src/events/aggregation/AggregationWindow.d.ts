/**
 * Aggregation window with backpressure awareness (FS-102)
 *
 * Adjusts batching window based on backpressure state:
 * - NORMAL: 200ms (optimal aggregation)
 * - WARNING: 150ms (accelerate processing)
 * - CRITICAL: 100ms (fast drain)
 * - OVERFLOW: 50ms (minimum latency)
 *
 * FS-103 增強：
 * - 與 BackpressureManager 雙向反饋
 * - 窗口調整通知機制
 */
import type { BackpressureManager } from '../BackpressureManager'
import { BackpressureState } from '../BackpressureManager'
import type { WindowStats } from './types'
/**
 * Aggregation window manager with backpressure awareness.
 */
export declare class AggregationWindow {
  private currentWindowMs
  private readonly minWindowMs
  private readonly maxWindowMs
  private stats
  private backpressureManager?
  /**
   * Create an aggregation window.
   *
   * @param initialWindowMs - Initial window size (default 200ms)
   */
  constructor(initialWindowMs?: number)
  /**
   * Set the BackpressureManager for feedback loop (FS-103).
   *
   * @param manager - BackpressureManager instance
   */
  setBackpressureManager(manager: BackpressureManager): void
  /**
   * Adjust window based on backpressure state.
   *
   * @param state - Current backpressure state
   */
  adjustWindow(state: BackpressureState): number
  /**
   * Notify BackpressureManager of window adjustment (FS-103).
   * Part of the backpressure feedback loop for automatic state recovery.
   *
   * @param oldWindowMs - Previous window size
   * @param newWindowMs - New window size
   * @private
   */
  private notifyBackpressureManager
  /**
   * Get current window size.
   */
  getCurrentWindow(): number
  /**
   * Get minimum window size.
   */
  getMinWindow(): number
  /**
   * Get maximum window size.
   */
  getMaxWindow(): number
  /**
   * Get statistics.
   */
  getStats(): WindowStats
  /**
   * Reset statistics.
   */
  resetStats(): void
  /**
   * Reset window to initial size.
   */
  reset(windowMs?: number): void
}

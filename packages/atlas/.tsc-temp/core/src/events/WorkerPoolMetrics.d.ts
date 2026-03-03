/**
 * Worker Pool Metrics for OpenTelemetry integration.
 *
 * Tracks worker pool statistics and emits metrics using OpenTelemetry.
 * Follows the Provider Callback pattern for dynamic metric collection.
 *
 * @internal
 */
import type { Meter } from '@opentelemetry/api'
/**
 * Worker Pool Metrics Recorder
 */
export declare class WorkerPoolMetrics {
  private meter
  private taskDurationHistogram?
  private taskCounter?
  private autoScalingCounter?
  private poolSizeCallback?
  private utilizationCallback?
  private queueDepthCallback?
  constructor(meter: Meter)
  /**
   * Initialize OpenTelemetry metrics
   */
  private initializeMetrics
  /**
   * Set provider callback for pool size metric
   */
  setPoolSizeProvider(callback: () => number): void
  /**
   * Set provider callback for utilization metric
   */
  setUtilizationProvider(callback: () => number): void
  /**
   * Set provider callback for queue depth metric
   */
  setQueueDepthProvider(callback: () => number): void
  /**
   * Record task execution
   *
   * @param durationMs - Task execution duration in milliseconds
   * @param priority - Task priority level
   * @param success - Whether task succeeded
   */
  recordTaskExecution(durationMs: number, priority: string, success: boolean): void
  /**
   * Record auto-scaling event
   *
   * @param action - 'scale-up' or 'scale-down'
   * @param reason - Reason for scaling
   */
  recordAutoScaling(action: 'scale-up' | 'scale-down', reason: string): void
  /**
   * Get the current pool size (for provider callbacks)
   */
  getPoolSize(): number
  /**
   * Get the current utilization (for provider callbacks)
   */
  getUtilization(): number
  /**
   * Get the current queue depth (for provider callbacks)
   */
  getQueueDepth(): number
}

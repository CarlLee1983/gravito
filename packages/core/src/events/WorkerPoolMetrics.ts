/**
 * Worker Pool Metrics for OpenTelemetry integration.
 *
 * Tracks worker pool statistics and emits metrics using OpenTelemetry.
 * Follows the Provider Callback pattern for dynamic metric collection.
 *
 * @internal
 */

import type { Counter, Histogram, Meter } from '@opentelemetry/api'

/**
 * Worker Pool Metrics Recorder
 */
export class WorkerPoolMetrics {
  private taskDurationHistogram?: Histogram
  private taskCounter?: Counter
  private autoScalingCounter?: Counter
  private poolSizeCallback?: () => number
  private utilizationCallback?: () => number
  private queueDepthCallback?: () => number

  constructor(private meter: Meter) {
    this.initializeMetrics()
  }

  /**
   * Initialize OpenTelemetry metrics
   */
  private initializeMetrics(): void {
    // Histogram for task execution duration (in milliseconds)
    this.taskDurationHistogram = this.meter.createHistogram('gravito_worker_task_duration_ms', {
      description: 'Duration of task execution in milliseconds',
      unit: 'ms',
    })

    // Counter for task execution
    this.taskCounter = this.meter.createCounter('gravito_worker_task_total', {
      description: 'Total number of tasks processed',
    })

    // Counter for auto-scaling events
    this.autoScalingCounter = this.meter.createCounter('gravito_worker_autoscale_total', {
      description: 'Total number of auto-scaling events',
    })

    // Note: Observable Gauges for pool metrics are not created here as they require
    // callback registration which is deferred to when setPoolSizeProvider/etc are called
  }

  /**
   * Set provider callback for pool size metric
   */
  setPoolSizeProvider(callback: () => number): void {
    this.poolSizeCallback = callback
  }

  /**
   * Set provider callback for utilization metric
   */
  setUtilizationProvider(callback: () => number): void {
    this.utilizationCallback = callback
  }

  /**
   * Set provider callback for queue depth metric
   */
  setQueueDepthProvider(callback: () => number): void {
    this.queueDepthCallback = callback
  }

  /**
   * Record task execution
   *
   * @param durationMs - Task execution duration in milliseconds
   * @param priority - Task priority level
   * @param success - Whether task succeeded
   */
  recordTaskExecution(durationMs: number, priority: string, success: boolean): void {
    const status = success ? 'success' : 'failure'

    if (this.taskDurationHistogram) {
      this.taskDurationHistogram.record(durationMs, {
        priority,
        status,
      })
    }

    if (this.taskCounter) {
      this.taskCounter.add(1, {
        priority,
        status,
      })
    }
  }

  /**
   * Record auto-scaling event
   *
   * @param action - 'scale-up' or 'scale-down'
   * @param reason - Reason for scaling
   */
  recordAutoScaling(action: 'scale-up' | 'scale-down', reason: string): void {
    if (this.autoScalingCounter) {
      this.autoScalingCounter.add(1, {
        action,
        reason,
      })
    }
  }

  /**
   * Get the current pool size (for provider callbacks)
   */
  getPoolSize(): number {
    return this.poolSizeCallback?.() ?? 0
  }

  /**
   * Get the current utilization (for provider callbacks)
   */
  getUtilization(): number {
    return this.utilizationCallback?.() ?? 0
  }

  /**
   * Get the current queue depth (for provider callbacks)
   */
  getQueueDepth(): number {
    return this.queueDepthCallback?.() ?? 0
  }
}

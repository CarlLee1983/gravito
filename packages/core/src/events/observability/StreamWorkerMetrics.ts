/**
 * Worker Pool Metrics Recorder for OpenTelemetry integration.
 *
 * Tracks Worker Pool statistics and emits OpenTelemetry metrics.
 *
 * @internal
 */

import type { Counter, Histogram, Meter } from '@opentelemetry/api'

/**
 * Worker job status for metrics.
 */
export enum WorkerJobStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Stream Worker Metrics Recorder.
 *
 * Collects and records metrics related to Worker Pool execution:
 * - Pool size and utilization
 * - Job execution duration
 * - Job success/failure counts
 * - Queue depth
 */
export class StreamWorkerMetrics {
  private poolSizeGauge?: any
  private jobDurationHistogram?: Histogram
  private jobCounterCompleted?: Counter
  private jobCounterFailed?: Counter
  private queueDepthGauge?: any

  constructor(private meter: Meter) {
    this.initializeMetrics()
  }

  /**
   * Initialize OpenTelemetry metrics.
   */
  private initializeMetrics(): void {
    // Histogram for job duration (in seconds)
    this.jobDurationHistogram = this.meter.createHistogram('gravito_worker_job_duration_seconds', {
      description: 'Duration of worker job execution in seconds',
      unit: 's',
    })

    // Counter for completed jobs
    this.jobCounterCompleted = this.meter.createCounter('gravito_worker_job_total', {
      description: 'Total number of worker jobs processed',
    })

    // Observable Gauge for pool size
    this.poolSizeGauge = this.meter.createObservableGauge('gravito_worker_pool_size', {
      description: 'Number of active workers in the pool',
    })

    // Observable Gauge for queue depth
    this.queueDepthGauge = this.meter.createObservableGauge('gravito_worker_pool_queue_depth', {
      description: 'Number of jobs waiting in the queue',
    })
  }

  /**
   * Record job execution duration.
   *
   * @param durationSeconds - Duration in seconds
   * @param status - Job status (completed or failed)
   * @param queue - Queue name
   */
  recordJobDuration(durationSeconds: number, status: WorkerJobStatus, queue = 'default'): void {
    if (this.jobDurationHistogram) {
      this.jobDurationHistogram.record(durationSeconds, {
        queue,
        status,
      })
    }

    // Also increment job counter
    if (this.jobCounterCompleted) {
      this.jobCounterCompleted.add(1, {
        queue,
        status,
      })
    }
  }

  /**
   * Record pool size change.
   *
   * @param poolSize - Current pool size
   * @param callback - Optional callback to fetch pool size dynamically
   */
  setPoolSizeProvider(callback: () => number): void {
    if (this.poolSizeGauge && typeof callback === 'function') {
      // Note: In real OpenTelemetry, this would be an observable callback
      // For now, we store the callback for later use
      this.poolSizeCallback = callback
    }
  }

  private poolSizeCallback?: () => number

  /**
   * Get current pool size.
   */
  getPoolSize(): number {
    return this.poolSizeCallback?.() ?? 0
  }

  /**
   * Record queue depth change.
   *
   * @param depth - Current queue depth
   * @param callback - Optional callback to fetch queue depth dynamically
   */
  setQueueDepthProvider(callback: () => number): void {
    if (this.queueDepthGauge && typeof callback === 'function') {
      this.queueDepthCallback = callback
    }
  }

  private queueDepthCallback?: () => number

  /**
   * Get current queue depth.
   */
  getQueueDepth(): number {
    return this.queueDepthCallback?.() ?? 0
  }
}

/**
 * Worker Metrics Recorder interface for dependency injection.
 */
export interface WorkerMetricsRecorder {
  recordJobDuration(durationSeconds: number, status: WorkerJobStatus, queue?: string): void
  setPoolSizeProvider(callback: () => number): void
  setQueueDepthProvider(callback: () => number): void
  getPoolSize(): number
  getQueueDepth(): number
}

/**
 * Worker Pool Metrics Recorder for OpenTelemetry integration.
 *
 * Tracks Worker Pool statistics and emits OpenTelemetry metrics.
 *
 * @internal
 */
import type { Meter } from '@opentelemetry/api'
/**
 * Worker job status for metrics.
 */
export declare enum WorkerJobStatus {
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
export declare class StreamWorkerMetrics {
  private meter
  private jobDurationHistogram?
  private jobCounterCompleted?
  constructor(meter: Meter)
  /**
   * Initialize OpenTelemetry metrics.
   */
  private initializeMetrics
  /**
   * Record job execution duration.
   *
   * @param durationSeconds - Duration in seconds
   * @param status - Job status (completed or failed)
   * @param queue - Queue name
   */
  recordJobDuration(durationSeconds: number, status: WorkerJobStatus, queue?: string): void
  /**
   * Record pool size change.
   *
   * @param poolSize - Current pool size
   * @param callback - Optional callback to fetch pool size dynamically
   */
  setPoolSizeProvider(callback: () => number): void
  private poolSizeCallback?
  /**
   * Get current pool size.
   */
  getPoolSize(): number
  /**
   * Record queue depth change.
   *
   * @param depth - Current queue depth
   * @param callback - Optional callback to fetch queue depth dynamically
   */
  setQueueDepthProvider(callback: () => number): void
  private queueDepthCallback?
  /**
   * Get current queue depth.
   */
  getQueueDepth(): number
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

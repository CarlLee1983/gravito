/**
 * Worker Pool for concurrent event task processing.
 *
 * Manages a pool of workers for executing event tasks concurrently.
 * Supports auto-scaling, health checks, and OpenTelemetry metrics integration.
 *
 * @internal
 */
import type { Meter } from '@opentelemetry/api'
import type { EventTask } from './types'
import type { WorkerPoolConfig, WorkerPoolStats, WorkerStats } from './WorkerPoolConfig'
/**
 * Worker Pool for managing concurrent task execution
 */
export declare class WorkerPool {
  private workers
  private taskQueue
  private config
  private metrics?
  private healthCheckTimer?
  private metricsTimer?
  private isRunning
  private scaleDownCounter
  constructor(config?: WorkerPoolConfig, meter?: Meter)
  /**
   * Start the worker pool
   */
  start(): Promise<void>
  /**
   * Stop the worker pool
   */
  stop(): Promise<void>
  /**
   * Submit a task to the worker pool
   */
  submitTask(task: EventTask): Promise<void>
  /**
   * Process next task in queue
   */
  private processQueue
  /**
   * Execute task on a worker
   */
  private executeTask
  /**
   * Execute task callbacks
   */
  private executeTaskCallbacks
  /**
   * Create a timeout promise
   */
  private createTimeout
  /**
   * Create a new worker
   */
  private createWorker
  /**
   * Remove a worker
   */
  private removeWorker
  /**
   * Perform health check and cleanup
   */
  private performHealthCheck
  /**
   * Perform auto-scaling based on load
   */
  private performAutoScaling
  /**
   * Collect metrics
   */
  private collectMetrics
  /**
   * Get number of active workers (not terminated)
   */
  private getActiveWorkerCount
  /**
   * Get worker utilization (0-1)
   */
  private getUtilization
  /**
   * Get queue depth
   */
  getQueueDepth(): number
  /**
   * Get worker utilization
   */
  getWorkerUtilization(): number
  /**
   * Get worker statistics
   */
  getWorkerStats(): WorkerStats[]
  /**
   * Get pool statistics
   */
  getPoolStats(): WorkerPoolStats
}
export type { WorkerPoolConfig, WorkerStats, WorkerPoolStats }

/**
 * Worker Pool for concurrent event task processing.
 *
 * Manages a pool of workers for executing event tasks concurrently.
 * Supports auto-scaling, health checks, and OpenTelemetry metrics integration.
 *
 * @internal
 */

import { randomUUID } from '../compat/crypto'
import type { Meter } from '@opentelemetry/api'
import type { EventTask } from './types'
import type { TaskSource, WorkerPoolConfig, WorkerPoolStats, WorkerStats } from './WorkerPoolConfig'
import { WorkerPoolMetrics } from './WorkerPoolMetrics'

/**
 * Internal Worker representation
 */
interface Worker {
  id: string
  state: 'idle' | 'busy' | 'terminated'
  tasksProcessed: number
  tasksSuccess: number
  tasksFailed: number
  totalDurationMs: number
  createdAt: number
}

/**
 * Worker Pool for managing concurrent task execution
 */
export class WorkerPool {
  private workers: Worker[] = []
  private taskQueue: EventTask[] = []
  private config: {
    concurrency: number
    workerThreads: number
    taskTimeout: number
    maxRetries: number
    enableAutoScaling: boolean
    minWorkers: number
    maxWorkers: number
    scaleUpThreshold: number
    scaleDownThreshold: number
    metricsInterval: number
    taskSource?: TaskSource
  }
  private metrics?: WorkerPoolMetrics
  private healthCheckTimer?: any
  private metricsTimer?: any
  private isRunning = false
  private scaleDownCounter = 0

  constructor(config: WorkerPoolConfig = {}, meter?: Meter) {
    // Set defaults
    let cpuCores = 1
    try {
      if (typeof process !== 'undefined' && !(process as any).browser) {
        // biome-ignore lint/security/noGlobalEval: specialized case for hiding node built-ins
        cpuCores = Math.max(1, eval('require')('node:os').cpus().length)
      }
    } catch (e) {
      // Fallback to 1
    }

    this.config = {
      concurrency: config.concurrency ?? 4,
      workerThreads: config.workerThreads ?? cpuCores,
      taskTimeout: config.taskTimeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      enableAutoScaling: config.enableAutoScaling ?? true,
      minWorkers: config.minWorkers ?? 1,
      maxWorkers: config.maxWorkers ?? cpuCores * 2,
      scaleUpThreshold: config.scaleUpThreshold ?? 0.8,
      scaleDownThreshold: config.scaleDownThreshold ?? 0.2,
      metricsInterval: config.metricsInterval ?? 5000,
      taskSource: config.taskSource,
    }

    if (meter) {
      this.metrics = new WorkerPoolMetrics(meter)
      // Set up provider callbacks
      this.metrics.setPoolSizeProvider(() => this.getActiveWorkerCount())
      this.metrics.setUtilizationProvider(() => this.getUtilization())
      this.metrics.setQueueDepthProvider(() => this.taskQueue.length)
    }
  }

  /**
   * Start the worker pool
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // Initialize workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.createWorker()
    }

    // Start health check
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.metricsInterval
    )

    // Start metrics collection
    this.metricsTimer = setInterval(() => this.collectMetrics(), this.config.metricsInterval)

    // Start auto-scaling if enabled
    if (this.config.enableAutoScaling) {
      setInterval(() => this.performAutoScaling(), this.config.metricsInterval)
    }
  }

  /**
   * Stop the worker pool
   */
  async stop(): Promise<void> {
    this.isRunning = false

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
    }

    // Mark all workers as terminated
    for (const worker of this.workers) {
      worker.state = 'terminated'
    }

    // Wait for queue to drain
    const maxWaitTime = 5000
    const startTime = Date.now()
    while (this.taskQueue.length > 0 && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    this.workers = []
    this.taskQueue = []
  }

  /**
   * Submit a task to the worker pool
   */
  async submitTask(task: EventTask): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Worker pool is not running')
    }

    this.taskQueue.push(task)
    this.processQueue()
  }

  /**
   * Process next task in queue
   */
  private processQueue(): void {
    if (!this.isRunning) {
      return
    }

    for (const worker of this.workers) {
      if (worker.state === 'idle' && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()
        if (task) {
          this.executeTask(worker, task)
        }
      }
    }
  }

  /**
   * Execute task on a worker
   */
  private async executeTask(worker: Worker, task: EventTask): Promise<void> {
    worker.state = 'busy'
    const startTime = performance.now()

    try {
      // Execute task callbacks
      await this.executeTaskCallbacks(task)

      worker.tasksSuccess++

      // Acknowledge completion to task source
      if (this.config.taskSource) {
        await this.config.taskSource.acknowledgeCompletion(task.id)
      }

      const duration = performance.now() - startTime
      this.metrics?.recordTaskExecution(duration, task.options.priority || 'normal', true)
    } catch (error) {
      worker.tasksFailed++

      // Acknowledge failure to task source
      if (this.config.taskSource && error instanceof Error) {
        await this.config.taskSource.acknowledgeFailure(task.id, error)
      }

      const duration = performance.now() - startTime
      this.metrics?.recordTaskExecution(duration, task.options.priority || 'normal', false)
    } finally {
      worker.tasksProcessed++
      worker.totalDurationMs += performance.now() - startTime

      worker.state = 'idle'

      // Process next task
      setImmediate(() => this.processQueue())
    }
  }

  /**
   * Execute task callbacks
   */
  private async executeTaskCallbacks(task: EventTask): Promise<void> {
    for (const callback of task.callbacks) {
      await Promise.race([callback(task.args), this.createTimeout(this.config.taskTimeout)])
    }
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task timeout after ${ms}ms`))
      }, ms)
    })
  }

  /**
   * Create a new worker
   */
  private createWorker(): Worker {
    const worker: Worker = {
      id: randomUUID(),
      state: 'idle',
      tasksProcessed: 0,
      tasksSuccess: 0,
      tasksFailed: 0,
      totalDurationMs: 0,
      createdAt: Date.now(),
    }
    this.workers.push(worker)
    return worker
  }

  /**
   * Remove a worker
   */
  private removeWorker(workerId: string): void {
    const index = this.workers.findIndex((w) => w.id === workerId)
    if (index !== -1) {
      this.workers[index].state = 'terminated'
      this.workers.splice(index, 1)
    }
  }

  /**
   * Perform health check and cleanup
   */
  private performHealthCheck(): void {
    // Remove terminated workers
    this.workers = this.workers.filter((w) => w.state !== 'terminated')

    // If no workers, create minimum
    if (this.workers.length === 0 && this.isRunning) {
      for (let i = 0; i < this.config.minWorkers; i++) {
        this.createWorker()
      }
    }
  }

  /**
   * Perform auto-scaling based on load
   */
  private async performAutoScaling(): Promise<void> {
    if (!this.config.enableAutoScaling) {
      return
    }

    const utilization = this.getUtilization()
    const activeWorkers = this.getActiveWorkerCount()

    // Scale up if utilization is high
    if (utilization > this.config.scaleUpThreshold && activeWorkers < this.config.maxWorkers) {
      this.createWorker()
      this.metrics?.recordAutoScaling('scale-up', `Utilization: ${(utilization * 100).toFixed(1)}%`)
      this.scaleDownCounter = 0 // Reset scale down counter
    }
    // Scale down if utilization is low (with delay)
    else if (
      utilization < this.config.scaleDownThreshold &&
      activeWorkers > this.config.minWorkers
    ) {
      this.scaleDownCounter++
      if (this.scaleDownCounter >= 3) {
        const workerToRemove = this.workers.find((w) => w.state === 'idle')
        if (workerToRemove) {
          this.removeWorker(workerToRemove.id)
          this.metrics?.recordAutoScaling(
            'scale-down',
            `Utilization: ${(utilization * 100).toFixed(1)}%`
          )
        }
        this.scaleDownCounter = 0
      }
    } else {
      this.scaleDownCounter = 0 // Reset if utilization is in range
    }
  }

  /**
   * Collect metrics
   */
  private collectMetrics(): void {
    // Metrics are collected through provider callbacks
    // This method can be extended for additional logic
  }

  /**
   * Get number of active workers (not terminated)
   */
  private getActiveWorkerCount(): number {
    return this.workers.filter((w) => w.state !== 'terminated').length
  }

  /**
   * Get worker utilization (0-1)
   */
  private getUtilization(): number {
    const busyWorkers = this.workers.filter((w) => w.state === 'busy').length
    const totalWorkers = this.getActiveWorkerCount()

    if (totalWorkers === 0) {
      return 0
    }

    return busyWorkers / totalWorkers
  }

  /**
   * Get queue depth
   */
  getQueueDepth(): number {
    return this.taskQueue.length
  }

  /**
   * Get worker utilization
   */
  getWorkerUtilization(): number {
    return this.getUtilization()
  }

  /**
   * Get worker statistics
   */
  getWorkerStats(): WorkerStats[] {
    return this.workers.map((w) => ({
      id: w.id,
      state: w.state,
      tasksProcessed: w.tasksProcessed,
      tasksSuccess: w.tasksSuccess,
      tasksFailed: w.tasksFailed,
      avgDurationMs: w.tasksProcessed > 0 ? w.totalDurationMs / w.tasksProcessed : 0,
      uptime: Date.now() - w.createdAt,
    }))
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): WorkerPoolStats {
    const stats: WorkerPoolStats = {
      queueDepth: this.taskQueue.length,
      utilization: this.getUtilization(),
      activeWorkers: this.getActiveWorkerCount(),
      totalTasksProcessed: 0,
      totalSuccess: 0,
      totalFailures: 0,
    }

    for (const worker of this.workers) {
      stats.totalTasksProcessed += worker.tasksProcessed
      stats.totalSuccess += worker.tasksSuccess
      stats.totalFailures += worker.tasksFailed
    }

    return stats
  }
}

export type { WorkerPoolConfig, WorkerStats, WorkerPoolStats }

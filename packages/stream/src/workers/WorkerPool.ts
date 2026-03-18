/**
 * Worker Pool Implementation.
 *
 * Manages a pool of Sandboxed Workers to provide concurrency control,
 * worker reuse, load balancing, and health monitoring.
 *
 * @public
 */

import type { SerializedJob } from '../types'
import type { SandboxedWorkerConfig } from './SandboxedWorker'
import {
  type IWorkerFactory,
  RuntimeAwareWorkerFactory,
  type RuntimeEnvironment,
  type Worker,
  type WorkerConfig,
} from './WorkerFactory'

/**
 * Configuration options for the Worker Pool.
 */
export interface WorkerPoolConfig extends SandboxedWorkerConfig {
  /**
   * The maximum number of workers allowed in the pool.
   *
   * @default 4
   */
  poolSize?: number

  /**
   * The minimum number of workers to keep alive.
   *
   * The pool will pre-warm and maintain at least this many ready workers.
   * @default 0
   */
  minWorkers?: number

  /**
   * Interval for performing health checks in milliseconds.
   *
   * Periodically scans for and removes terminated or unhealthy workers.
   * @default 30000 (30 seconds)
   */
  healthCheckInterval?: number

  /**
   * Custom worker factory for creating workers.
   *
   * If not provided, RuntimeAwareWorkerFactory will be used with the runtime option.
   * @default undefined
   */
  factory?: IWorkerFactory

  /**
   * Runtime environment to use for worker creation.
   *
   * - `'auto'` or undefined: Automatically detect (Bun or Node.js)
   * - `'bun'`: Force Bun runtime
   * - `'node'`: Force Node.js runtime
   * - `'bun'`/`'node'`: Only used if factory is not provided
   *
   * @default 'auto'
   */
  runtime?: RuntimeEnvironment
}

/**
 * Runtime statistics for the Worker Pool.
 */
export interface WorkerPoolStats {
  /** Total number of workers (ready + busy). */
  total: number
  /** Number of idle workers ready for new jobs. */
  ready: number
  /** Number of workers currently executing jobs. */
  busy: number
  /** Number of workers in terminated state awaiting cleanup. */
  terminated: number
  /** Number of jobs waiting in the queue. */
  pending: number
  /** Total number of successfully completed jobs. */
  completed: number
  /** Total number of failed jobs. */
  failed: number
}

/**
 * Worker Pool.
 *
 * Orchestrates multiple `SandboxedWorker` or `BunWorker` instances to execute jobs concurrently.
 * Automatically selects the best worker implementation based on the runtime environment.
 *
 * Key features:
 * - **Concurrency Control**: Limits the number of simultaneous job executions (`poolSize`).
 * - **Queueing**: Queues jobs when all workers are busy.
 * - **Lifecycle Management**: Automatically creates, reuses, and terminates workers.
 * - **Health Monitoring**: Periodically cleans up dead workers and maintains `minWorkers`.
 * - **Runtime-Aware**: Automatically uses BunWorker on Bun, SandboxedWorker on Node.js.
 *
 * @example
 * ```typescript
 * // Auto-detection (uses best available runtime)
 * const pool = new WorkerPool({
 *   poolSize: 8,
 *   minWorkers: 2,
 *   maxExecutionTime: 30000
 * });
 *
 * // Force specific runtime
 * const bunPool = new WorkerPool({
 *   runtime: 'bun',
 *   poolSize: 8
 * });
 *
 * await pool.execute(job);
 * await pool.shutdown();
 * ```
 */
export class WorkerPool {
  private workers: Worker[] = []
  private factory: IWorkerFactory
  private config: Required<Omit<WorkerPoolConfig, 'factory' | 'runtime'>> & {
    factory: IWorkerFactory
    runtime: RuntimeEnvironment
  }
  private queue: Array<{
    job: SerializedJob
    resolve: () => void
    reject: (error: Error) => void
  }> = []
  private healthCheckTimer: NodeJS.Timeout | null = null
  private stats = {
    completed: 0,
    failed: 0,
  }

  /**
   * Creates a WorkerPool instance.
   *
   * @param config - Configuration options for the pool.
   */
  constructor(config: WorkerPoolConfig = {}) {
    // Initialize factory
    this.factory = config.factory ?? new RuntimeAwareWorkerFactory(config.runtime ?? 'auto')

    this.config = {
      poolSize: config.poolSize ?? 4,
      minWorkers: config.minWorkers ?? 0,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
      maxExecutionTime: config.maxExecutionTime ?? 30000,
      maxMemory: config.maxMemory ?? 0,
      isolateContexts: config.isolateContexts ?? false,
      idleTimeout: config.idleTimeout ?? 60000,
      factory: this.factory,
      runtime: config.runtime ?? 'auto',
    }

    this.warmUp()
    this.startHealthCheck()
  }

  /**
   * Pre-warms the pool by creating the minimum number of workers.
   */
  private warmUp(): void {
    const targetCount = Math.min(this.config.minWorkers, this.config.poolSize)
    for (let i = 0; i < targetCount; i++) {
      this.createWorker()
    }
  }

  /**
   * Creates a new Worker (BunWorker or SandboxedWorker) and adds it to the pool.
   *
   * Uses the configured factory to create the appropriate worker type
   * based on the runtime environment.
   *
   * @returns The newly created worker.
   */
  private createWorker(): Worker {
    const config: WorkerConfig = {
      maxExecutionTime: this.config.maxExecutionTime,
      maxMemory: this.config.maxMemory,
      isolateContexts: this.config.isolateContexts,
      idleTimeout: this.config.idleTimeout,
    }

    const worker = this.factory.create(config)

    this.workers.push(worker)
    return worker
  }

  /**
   * Retrieves an available worker from the pool.
   *
   * Priorities:
   * 1. Reuse an existing ready worker.
   * 2. Create a new worker if the pool is not full.
   * 3. Return `null` if the pool is saturated.
   *
   * @returns An available worker or `null`.
   */
  private getAvailableWorker(): Worker | null {
    const readyWorker = this.workers.find((w) => w.isReady())
    if (readyWorker) {
      return readyWorker
    }

    if (this.workers.length < this.config.poolSize) {
      return this.createWorker()
    }

    return null
  }

  /**
   * Executes a job using the worker pool.
   *
   * If a worker is available, the job starts immediately.
   * Otherwise, it is added to the pending queue.
   *
   * @param job - The serialized job data.
   * @throws {Error} If execution fails.
   */
  async execute(job: SerializedJob): Promise<void> {
    const worker = this.getAvailableWorker()

    if (worker) {
      try {
        await worker.execute(job)
        this.stats.completed++
      } catch (error) {
        this.stats.failed++
        throw error
      } finally {
        this.processQueue()
      }
    } else {
      return new Promise<void>((resolve, reject) => {
        this.queue.push({ job, resolve, reject })
      })
    }
  }

  /**
   * Processes the next job in the queue if a worker is available.
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      return
    }

    const worker = this.getAvailableWorker()
    if (!worker) {
      return
    }

    const item = this.queue.shift()
    if (!item) {
      return
    }

    worker
      .execute(item.job)
      .then(() => {
        this.stats.completed++
        item.resolve()
      })
      .catch((error) => {
        this.stats.failed++
        item.reject(error)
      })
      .finally(() => {
        this.processQueue()
      })
  }

  /**
   * Starts the periodic health check.
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      return
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }

  /**
   * Performs a health check on the pool.
   *
   * Removes terminated workers and ensures `minWorkers` are available.
   */
  private performHealthCheck(): void {
    this.workers = this.workers.filter((worker) => {
      if (worker.getState() === 'terminated') {
        worker.terminate().catch(console.error)
        return false
      }
      return true
    })

    const activeWorkers = this.workers.length
    if (activeWorkers < this.config.minWorkers) {
      const needed = this.config.minWorkers - activeWorkers
      for (let i = 0; i < needed; i++) {
        this.createWorker()
      }
    }
  }

  /**
   * Gets the current statistics of the worker pool.
   *
   * @returns Snapshot of pool statistics.
   */
  getStats(): WorkerPoolStats {
    let ready = 0
    let busy = 0
    let terminated = 0

    for (const worker of this.workers) {
      const state = worker.getState()
      if (state === 'ready') {
        ready++
      } else if (state === 'busy') {
        busy++
      } else if (state === 'terminated') {
        terminated++
      }
    }

    return {
      total: this.workers.length,
      ready,
      busy,
      terminated,
      pending: this.queue.length,
      completed: this.stats.completed,
      failed: this.stats.failed,
    }
  }

  /**
   * Shuts down the worker pool.
   *
   * Terminates all workers and rejects any pending jobs.
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }

    for (const item of this.queue) {
      item.reject(new Error('Worker pool is shutting down'))
    }
    this.queue = []

    await Promise.all(this.workers.map((worker) => worker.terminate().catch(console.error)))

    this.workers = []
  }

  /**
   * Waits for all active and pending jobs to complete.
   *
   * @param timeout - Maximum wait time in milliseconds. 0 for infinite.
   * @throws {Error} If the timeout is reached.
   */
  async waitForCompletion(timeout = 0): Promise<void> {
    const startTime = Date.now()

    return new Promise<void>((resolve, reject) => {
      const checkCompletion = () => {
        const stats = this.getStats()
        const isComplete = stats.busy === 0 && stats.pending === 0

        if (isComplete) {
          resolve()
          return
        }

        if (timeout > 0 && Date.now() - startTime > timeout) {
          reject(new Error('Wait for completion timeout'))
          return
        }

        setTimeout(checkCompletion, 100)
      }

      checkCompletion()
    })
  }
}

/**
 * Bun Worker Implementation.
 *
 * Executes jobs in isolated Bun Worker Threads to provide context isolation,
 * error containment, and leverages Bun's performance optimizations.
 *
 * Key advantages over Node.js Worker Threads:
 * - Native TypeScript support (no compilation needed)
 * - 2-241x faster message passing for common patterns
 * - Memory-efficient with `smol` mode
 * - Built-in module preloading
 *
 * @public
 */

import { resolve } from 'node:path'
import type { SerializedJob } from '../types'
import { encodeJobForTransfer } from './BinaryWorkerProtocol'

/**
 * Configuration options for the Bun Worker.
 */
export interface BunWorkerConfig {
  /**
   * Maximum execution time for a job in milliseconds.
   *
   * Jobs exceeding this duration will be forcefully terminated.
   * @default 30000 (30 seconds)
   */
  maxExecutionTime?: number

  /**
   * Maximum memory limit for the worker in MB.
   *
   * Note: Bun's memory management differs from Node.js.
   * This is advisory and may not be strictly enforced.
   * @default undefined (unlimited)
   */
  maxMemory?: number

  /**
   * Whether to isolate contexts for each job.
   *
   * If `true`, a new Worker is created for every job execution.
   * If `false`, the Worker is reused across multiple jobs.
   * @default false
   */
  isolateContexts?: boolean

  /**
   * Idle timeout for the Worker in milliseconds.
   *
   * The worker will be terminated if it remains idle for this duration to save resources.
   * @default 60000 (60 seconds)
   */
  idleTimeout?: number

  /**
   * Enable Bun's memory-saving mode with minimal performance tradeoff.
   *
   * Reduces memory footprint by approximately 20-30% per worker.
   * @default false
   */
  smol?: boolean

  /**
   * Modules to preload before worker starts.
   *
   * Useful for large libraries or frequently used dependencies.
   * Can be a single path or array of paths.
   * @default undefined
   */
  preload?: string | string[]

  /**
   * Enable debugging for this worker (opens inspector port).
   *
   * Useful for debugging worker code.
   * @default undefined
   */
  inspectPort?: number
}

/**
 * Internal state of the worker.
 */
enum WorkerState {
  /** Worker is initializing or starting up. */
  INITIALIZING = 'initializing',
  /** Worker is ready to accept jobs. */
  READY = 'ready',
  /** Worker is currently executing a job. */
  BUSY = 'busy',
  /** Worker has been terminated or exited. */
  TERMINATED = 'terminated',
}

/**
 * Response message format from worker.
 */
interface WorkerResponse {
  type: 'success' | 'error' | 'ready'
  error?: string
  stack?: string
}

type BunWorkerSpawnOptions = NonNullable<ConstructorParameters<typeof Worker>[1]> & {
  inspectPort?: number
  preload?: string[]
  smol?: boolean
}

type RefableWorker = Worker & {
  ref?: () => void
  unref?: () => void
}

/**
 * Bun Worker.
 *
 * Manages the lifecycle of a Bun Worker Thread for job execution.
 * Provides features like:
 * - Context Isolation: Run code in a separate thread.
 * - Timeout Enforcement: Terminate hangs or long-running jobs.
 * - Memory Optimization: Native support for memory-efficient mode (`smol`).
 * - Error Containment: Worker crashes do not crash the main application.
 * - Performance: Leverages Bun's optimized message passing.
 *
 * @example
 * ```typescript
 * const worker = new BunWorker({
 *   maxExecutionTime: 30000,
 *   maxMemory: 512,
 *   isolateContexts: true,
 *   smol: true
 * });
 *
 * await worker.execute(serializedJob);
 * await worker.terminate();
 * ```
 */
export class BunWorker {
  private worker: RefableWorker | null = null
  private state: WorkerState = WorkerState.INITIALIZING
  private config: {
    maxExecutionTime: number
    maxMemory: number
    isolateContexts: boolean
    idleTimeout: number
    smol: boolean
    preload?: string | string[]
    inspectPort?: number
  }
  private idleTimer: NodeJS.Timeout | null = null
  private executionTimer: NodeJS.Timeout | null = null

  /**
   * Creates a BunWorker instance.
   *
   * @param config - Configuration options for the worker.
   */
  constructor(config: BunWorkerConfig = {}) {
    this.config = {
      maxExecutionTime: config.maxExecutionTime ?? 30000,
      maxMemory: config.maxMemory ?? 0,
      isolateContexts: config.isolateContexts ?? false,
      idleTimeout: config.idleTimeout ?? 60000,
      smol: config.smol ?? false,
      preload: config.preload ?? undefined,
      inspectPort: config.inspectPort ?? undefined,
    }
  }

  /**
   * Initializes the Bun Worker.
   *
   * @returns The active Worker instance.
   * @throws {Error} If worker initialization fails or times out.
   */
  private async initWorker(): Promise<RefableWorker> {
    if (this.worker && this.state !== WorkerState.TERMINATED) {
      return this.worker
    }

    const workerPath = resolve(__dirname, 'bun-job-executor.ts')

    // Build worker options with Bun-specific features
    const workerOptions: BunWorkerSpawnOptions = {}

    // Enable memory-efficient mode if requested
    if (this.config.smol) {
      workerOptions.smol = true
    }

    // Add preload modules if specified
    if (this.config.preload) {
      const preloadModules = Array.isArray(this.config.preload)
        ? this.config.preload
        : [this.config.preload]
      workerOptions.preload = preloadModules
    }

    // Enable debugging if inspector port specified
    if (this.config.inspectPort && this.config.inspectPort > 0) {
      workerOptions.inspectPort = this.config.inspectPort
    }

    // Create the worker
    this.worker = new Worker(workerPath, workerOptions) as RefableWorker
    this.state = WorkerState.INITIALIZING

    // Wait for worker to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Bun Worker initialization timeout'))
      }, 5000)

      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data
        clearTimeout(timeout)

        if (message.type === 'ready') {
          cleanup()
          this.state = WorkerState.READY
          resolve()
        } else {
          cleanup()
          reject(new Error('Unexpected worker message during initialization'))
        }
      }

      const errorHandler = (event: ErrorEvent) => {
        clearTimeout(timeout)
        cleanup()
        reject(new Error(event.message || 'Worker initialization error'))
      }

      const cleanup = () => {
        if (this.worker) {
          this.worker.removeEventListener('message', messageHandler)
          this.worker.removeEventListener('error', errorHandler)
        }
      }

      if (this.worker) {
        this.worker.addEventListener('message', messageHandler)
        this.worker.addEventListener('error', errorHandler)
      }
    })

    // Set up error handler for runtime errors
    if (this.worker) {
      this.worker.addEventListener('error', (event: ErrorEvent) => {
        console.error('[BunWorker] Worker error:', event.message)
        this.state = WorkerState.TERMINATED
      })

      // Bun workers trigger 'close' event instead of 'exit'
      this.worker.addEventListener('close', () => {
        this.state = WorkerState.TERMINATED
      })
    }

    return this.worker
  }

  /**
   * Executes a job in the isolated Bun worker.
   *
   * @param job - The serialized job data to execute.
   * @throws {Error} If execution fails, times out, or the worker crashes.
   */
  async execute(job: SerializedJob): Promise<void> {
    if (this.config.isolateContexts) {
      await this.terminate()
    }

    const worker = await this.initWorker()
    this.state = WorkerState.BUSY

    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }

    try {
      await Promise.race([this.executeInWorker(worker, job), this.createTimeoutPromise()])
    } finally {
      this.state = WorkerState.READY

      if (this.executionTimer) {
        clearTimeout(this.executionTimer)
        this.executionTimer = null
      }

      if (!this.config.isolateContexts) {
        this.startIdleTimer()
      } else {
        await this.terminate()
      }
    }
  }

  /**
   * Internal method to send execution message to the worker thread.
   *
   * 使用 Binary Protocol（ArrayBuffer Transfer）傳遞 Job 資料：
   * 1. 將 job 編碼為 ArrayBuffer（JSON + TextEncoder）
   * 2. 透過 postMessage transfer list 零拷貝傳遞給 Worker
   * 3. 注意：buffer transfer 後即失效，但 job 引用仍有效（支援重試）
   *
   * @param worker - The worker instance.
   * @param job - Job data（保留此引用以支援潛在重試，不依賴已 transfer 的 buffer）
   */
  private executeInWorker(worker: Worker, job: SerializedJob): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data

        if (message.type === 'success') {
          cleanup()
          resolve()
        } else if (message.type === 'error') {
          cleanup()
          const error = new Error(message.error || 'Job execution failed')
          if (message.stack) {
            error.stack = message.stack
          }
          reject(error)
        }
      }

      const errorHandler = (event: ErrorEvent) => {
        cleanup()
        reject(new Error(event.message || 'Worker error'))
      }

      const cleanup = () => {
        worker.removeEventListener('message', messageHandler as EventListener)
        worker.removeEventListener('error', errorHandler as EventListener)
      }

      worker.addEventListener('message', messageHandler as EventListener)
      worker.addEventListener('error', errorHandler as EventListener)

      // 將 job 編碼為 ArrayBuffer 並以零拷貝方式 transfer 給 Worker
      // job 物件本身保留在 Main Thread 側，不受 transfer 影響
      const buffer = encodeJobForTransfer(job)
      worker.postMessage({ type: 'execute-binary', buffer }, [buffer])
    })
  }

  /**
   * Creates a promise that rejects after the configured timeout.
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise<never>((_, reject) => {
      this.executionTimer = setTimeout(() => {
        this.terminate().catch(console.error)
        reject(new Error(`Job execution timeout after ${this.config.maxExecutionTime}ms`))
      }, this.config.maxExecutionTime)
    })
  }

  /**
   * Starts the idle timer to auto-terminate the worker.
   */
  private startIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }

    this.idleTimer = setTimeout(() => {
      this.terminate().catch(console.error)
    }, this.config.idleTimeout)
  }

  /**
   * Terminates the Worker immediately.
   *
   * Stops any running job and releases resources.
   */
  async terminate(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }

    if (this.executionTimer) {
      clearTimeout(this.executionTimer)
      this.executionTimer = null
    }

    if (this.worker) {
      const worker = this.worker
      this.worker = null
      this.state = WorkerState.TERMINATED

      try {
        // Bun workers have terminate() method
        if (typeof worker.terminate === 'function') {
          await worker.terminate()
        }
      } catch (error) {
        console.error('[BunWorker] Error terminating worker:', error)
      }
    }
  }

  /**
   * Gets the current state of the worker.
   *
   * @returns The current `WorkerState`.
   */
  getState(): string {
    return this.state
  }

  /**
   * Checks if the worker is ready to accept a job.
   *
   * @returns `true` if ready, `false` otherwise.
   */
  isReady(): boolean {
    return this.state === WorkerState.READY
  }

  /**
   * Checks if the worker is currently executing a job.
   *
   * @returns `true` if busy, `false` otherwise.
   */
  isBusy(): boolean {
    return this.state === WorkerState.BUSY
  }

  /**
   * Unreferences the worker, allowing the process to exit even if worker is running.
   *
   * Bun-specific optimization for background workers.
   */
  unref(): void {
    if (typeof this.worker?.unref === 'function') {
      this.worker.unref()
    }
  }

  /**
   * Re-references the worker, preventing process exit while worker is running.
   *
   * Bun-specific optimization for background workers.
   */
  ref(): void {
    if (typeof this.worker?.ref === 'function') {
      this.worker.ref()
    }
  }
}

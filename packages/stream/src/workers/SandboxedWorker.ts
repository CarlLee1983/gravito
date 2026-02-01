/**
 * Sandboxed Worker Implementation.
 *
 * Executes jobs in isolated Worker Threads to provide context isolation,
 * error containment, and resource limits.
 *
 * @public
 */

import { resolve } from 'path'
import { Worker as ThreadWorker } from 'worker_threads'
import type { SerializedJob } from '../types'

/**
 * Configuration options for the Sandboxed Worker.
 */
export interface SandboxedWorkerConfig {
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
   * If the worker exceeds this limit, it will be terminated and restarted.
   * Note: Relies on `resourceLimits` which may vary by platform.
   * @default undefined (unlimited)
   */
  maxMemory?: number

  /**
   * Whether to isolate contexts for each job.
   *
   * If `true`, a new Worker Thread is created for every job execution.
   * If `false`, the Worker Thread is reused across multiple jobs.
   * @default false
   */
  isolateContexts?: boolean

  /**
   * Idle timeout for the Worker Thread in milliseconds.
   *
   * The worker will be terminated if it remains idle for this duration to save resources.
   * @default 60000 (60 seconds)
   */
  idleTimeout?: number
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
 * Sandboxed Worker.
 *
 * Manages the lifecycle of a Node.js Worker Thread for job execution.
 * Provides features like:
 * - Context Isolation: Run code in a separate thread.
 * - Timeout Enforcement: Terminate hangs or long-running jobs.
 * - Memory Limits: Prevent OOM issues affecting the main process.
 * - Error Containment: Worker crashes do not crash the main application.
 *
 * @example
 * ```typescript
 * const worker = new SandboxedWorker({
 *   maxExecutionTime: 30000,
 *   maxMemory: 512,
 *   isolateContexts: true
 * });
 *
 * await worker.execute(serializedJob);
 * await worker.terminate();
 * ```
 */
export class SandboxedWorker {
  private worker: ThreadWorker | null = null
  private state: WorkerState = WorkerState.INITIALIZING
  private config: Required<SandboxedWorkerConfig>
  private idleTimer: NodeJS.Timeout | null = null
  private executionTimer: NodeJS.Timeout | null = null

  /**
   * Creates a SandboxedWorker instance.
   *
   * @param config - Configuration options for the worker.
   */
  constructor(config: SandboxedWorkerConfig = {}) {
    this.config = {
      maxExecutionTime: config.maxExecutionTime ?? 30000,
      maxMemory: config.maxMemory ?? 0,
      isolateContexts: config.isolateContexts ?? false,
      idleTimeout: config.idleTimeout ?? 60000,
    }
  }

  /**
   * Initializes the Worker Thread.
   *
   * @returns The active Worker Thread instance.
   * @throws {Error} If worker initialization fails or times out.
   */
  private async initWorker(): Promise<ThreadWorker> {
    if (this.worker && this.state !== WorkerState.TERMINATED) {
      return this.worker
    }

    const workerPath = resolve(__dirname, 'job-executor.js')

    const resourceLimits: any = {}
    if (this.config.maxMemory > 0) {
      resourceLimits.maxOldGenerationSizeMb = this.config.maxMemory
      resourceLimits.maxYoungGenerationSizeMb = Math.min(this.config.maxMemory / 2, 128)
    }

    this.worker = new ThreadWorker(workerPath, {
      resourceLimits: Object.keys(resourceLimits).length > 0 ? resourceLimits : undefined,
    })

    this.state = WorkerState.INITIALIZING

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'))
      }, 5000)

      this.worker!.once('message', (message: any) => {
        clearTimeout(timeout)
        if (message.type === 'ready') {
          this.state = WorkerState.READY
          resolve()
        } else {
          reject(new Error('Unexpected worker message during initialization'))
        }
      })

      this.worker!.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })

    this.worker.on('error', (error) => {
      console.error('[SandboxedWorker] Worker error:', error)
      this.state = WorkerState.TERMINATED
    })

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[SandboxedWorker] Worker exited with code ${code}`)
      }
      this.state = WorkerState.TERMINATED
    })

    return this.worker
  }

  /**
   * Executes a job in the sandboxed environment.
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
   * @param worker - The worker thread instance.
   * @param job - Job data.
   */
  private executeInWorker(worker: ThreadWorker, job: SerializedJob): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const messageHandler = (message: any) => {
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

      const errorHandler = (error: Error) => {
        cleanup()
        reject(error)
      }

      const exitHandler = (code: number) => {
        cleanup()
        if (code !== 0) {
          reject(new Error(`Worker exited unexpectedly with code ${code}`))
        }
      }

      const cleanup = () => {
        worker.off('message', messageHandler)
        worker.off('error', errorHandler)
        worker.off('exit', exitHandler)
      }

      worker.on('message', messageHandler)
      worker.on('error', errorHandler)
      worker.on('exit', exitHandler)

      worker.postMessage({
        type: 'execute',
        job,
      })
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
   * Terminates the Worker Thread immediately.
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
        await worker.terminate()
      } catch (error) {
        console.error('[SandboxedWorker] Error terminating worker:', error)
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
}

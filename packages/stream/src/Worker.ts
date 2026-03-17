import type { Job } from './Job'
import type { SerializedJob } from './types'
import { SandboxedWorker, type SandboxedWorkerConfig } from './workers/SandboxedWorker'

/**
 * Configuration options for the Worker.
 *
 * Controls the execution behavior of jobs, including retry limits and timeouts.
 *
 * @example
 * ```typescript
 * const options: WorkerOptions = {
 *   maxAttempts: 3,
 *   timeout: 30
 * };
 * ```
 */
export interface WorkerOptions {
  /**
   * The maximum number of attempts for a job before it is marked as failed.
   *
   * This value serves as a default fallback if the job itself does not specify `maxAttempts`.
   */
  maxAttempts?: number

  /**
   * The maximum execution time for a job in seconds.
   *
   * If the job exceeds this duration, it will be timed out and marked as failed.
   */
  timeout?: number

  /**
   * Callback function triggered when a job permanently fails.
   *
   * This allows for custom error reporting or cleanup logic outside of the job class.
   */
  onFailed?: (job: Job, error: Error) => Promise<void>

  /**
   * Enable sandboxed execution using Worker Threads.
   *
   * When enabled, jobs are executed in isolated Worker Threads, providing:
   * - Context isolation: Each job runs in a separate execution environment
   * - Crash protection: Worker crashes don't affect the main thread
   * - Memory limits: Prevent memory leaks from affecting the main process
   * - Timeout enforcement: Jobs exceeding the timeout are forcefully terminated
   *
   * @default false
   */
  sandboxed?: boolean

  /**
   * Sandboxed worker configuration options.
   *
   * Only used when `sandboxed` is true.
   */
  sandboxConfig?: SandboxedWorkerConfig
}

/**
 * Executes background jobs.
 *
 * The Worker is responsible for running the `handle()` method of a job, managing its lifecycle,
 * enforcing timeouts, and handling retries or failures.
 *
 * Supports two execution modes:
 * - **Standard Mode** (default): Executes jobs directly in the current process
 * - **Sandboxed Mode**: Executes jobs in isolated Worker Threads for enhanced security and stability
 *
 * @example
 * ```typescript
 * // Standard mode
 * const worker = new Worker({
 *   maxAttempts: 3,
 *   timeout: 60
 * });
 *
 * // Sandboxed mode
 * const sandboxedWorker = new Worker({
 *   maxAttempts: 3,
 *   timeout: 60,
 *   sandboxed: true,
 *   sandboxConfig: {
 *     maxExecutionTime: 30000,
 *     maxMemory: 512,
 *     isolateContexts: true
 *   }
 * });
 *
 * await worker.process(job);
 * ```
 */
export class Worker {
  private sandboxedWorker?: SandboxedWorker

  constructor(private options: WorkerOptions = {}) {
    if (options.sandboxed) {
      this.sandboxedWorker = new SandboxedWorker(options.sandboxConfig)
    }
  }

  /**
   * Processes a single job instance.
   *
   * 1. Checks attempt counts.
   * 2. Enforces execution timeout (if configured).
   * 3. Runs `job.handle()` (either directly or in a sandboxed Worker Thread).
   * 4. Catches errors and invokes failure handlers if max attempts are reached.
   *
   * @param job - The job to process.
   * @throws {Error} If the job execution fails (to trigger retry logic in the consumer).
   */
  async process(job: Job): Promise<void> {
    const maxAttempts = job.maxAttempts ?? this.options.maxAttempts ?? 3
    const timeout = this.options.timeout

    // Ensure attempts is initialized
    if (!job.attempts) {
      job.attempts = 1
    }

    try {
      // Execute job (sandboxed or standard mode)
      if (this.options.sandboxed && this.sandboxedWorker) {
        await this.processSandboxed(job)
      } else {
        await this.processStandard(job, timeout)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Check if this was the last attempt
      // Note: Consumer is responsible for incrementing attempts and re-queueing if needed.
      // Here we just check if we SHOULD have failed.
      if (job.attempts >= maxAttempts) {
        await this.handleFailure(job, err)
      }

      throw err
    }
  }

  /**
   * Processes a job in standard mode (directly in current process).
   *
   * @param job - The job to process.
   * @param timeout - Optional timeout in seconds.
   */
  private async processStandard(job: Job, timeout?: number): Promise<void> {
    if (timeout) {
      await Promise.race([
        job.handle(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Job timeout after ${timeout} seconds`)),
            timeout * 1000
          )
        ),
      ])
    } else {
      await job.handle()
    }
  }

  /**
   * Processes a job in sandboxed mode (in Worker Thread).
   *
   * @param job - The job to process.
   */
  private async processSandboxed(job: Job): Promise<void> {
    if (!this.sandboxedWorker) {
      throw new Error('Sandboxed worker not initialized')
    }

    // Serialize Job to SerializedJob
    const serialized = this.serializeJob(job)

    // Execute in Worker Thread
    await this.sandboxedWorker.execute(serialized)
  }

  /**
   * Serializes a Job instance for Worker Thread execution.
   *
   * @param job - The job to serialize.
   * @returns Serialized job data.
   */
  private serializeJob(job: Job): SerializedJob {
    const properties: Record<string, unknown> = {}
    for (const key in job) {
      if (
        Object.hasOwn(job, key) &&
        typeof (job as unknown as Record<string, unknown>)[key] !== 'function'
      ) {
        properties[key] = (job as unknown as Record<string, unknown>)[key]
      }
    }

    const handleSource = serializeJobMethod(job, 'handle')
    const data = JSON.stringify({
      ...properties,
      __sandboxedJob: true,
      __handleSource: handleSource,
      __className: job.constructor.name,
    })

    return {
      id: job.id ?? `job-${Date.now()}-${Math.random()}`,
      type: 'json',
      data,
      createdAt: Date.now(),
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      delaySeconds: job.delaySeconds,
      groupId: job.groupId,
      priority: job.priority,
      retryAfterSeconds: job.retryAfterSeconds,
      retryMultiplier: job.retryMultiplier,
    }
  }

  /**
   * Handles the permanent failure of a job.
   *
   * Invokes the job's `failed()` method and any global `onFailed` callback.
   *
   * @param job - The failed job.
   * @param error - The error that caused the failure.
   */
  private async handleFailure(job: Job, error: Error): Promise<void> {
    // Call job.failed()
    try {
      await job.failed(error)
    } catch (failedError) {
      console.error('[Worker] Error in job.failed():', failedError)
    }

    // Call onFailed callback
    if (this.options.onFailed) {
      try {
        await this.options.onFailed(job, error)
      } catch (callbackError) {
        console.error('[Worker] Error in onFailed callback:', callbackError)
      }
    }
  }

  /**
   * Terminates the sandboxed worker and releases resources.
   *
   * Should be called when the worker is no longer needed.
   * Only applicable when running in sandboxed mode.
   */
  async terminate(): Promise<void> {
    if (this.sandboxedWorker) {
      await this.sandboxedWorker.terminate()
    }
  }
}

function serializeJobMethod(job: Job, methodName: 'handle'): string {
  const instanceMethod = (job as unknown as Record<string, unknown>)[methodName]
  if (typeof instanceMethod === 'function') {
    return normalizeMethodSource(instanceMethod.toString(), methodName)
  }

  throw new Error(`Job must implement ${methodName}()`)
}

function normalizeMethodSource(source: string, methodName: string): string {
  const trimmed = source.trim()
  const methodPattern = new RegExp(`^(async\\s+)?${methodName}\\s*\\(`)

  if (methodPattern.test(trimmed)) {
    return trimmed.replace(methodPattern, (_match, asyncKeyword: string | undefined) => {
      return `${asyncKeyword ?? ''}function ${methodName}(`
    })
  }

  return trimmed
}

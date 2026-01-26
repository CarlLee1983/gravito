import type { Job } from './Job'

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
}

/**
 * Executes background jobs.
 *
 * The Worker is responsible for running the `handle()` method of a job, managing its lifecycle,
 * enforcing timeouts, and handling retries or failures.
 *
 * @example
 * ```typescript
 * const worker = new Worker({
 *   maxAttempts: 3,
 *   timeout: 60
 * });
 *
 * await worker.process(job);
 * ```
 */
export class Worker {
  constructor(private options: WorkerOptions = {}) {}

  /**
   * Processes a single job instance.
   *
   * 1. Checks attempt counts.
   * 2. Enforces execution timeout (if configured).
   * 3. Runs `job.handle()`.
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
      // Execute job (with optional timeout)
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
}

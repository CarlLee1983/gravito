import type { Job } from './Job'

/**
 * Worker options.
 */
export interface WorkerOptions {
  /**
   * Maximum retry attempts.
   */
  maxAttempts?: number

  /**
   * Job timeout (seconds).
   */
  timeout?: number

  /**
   * Failure callback.
   */
  onFailed?: (job: Job, error: Error) => Promise<void>
}

/**
 * Base Worker.
 *
 * Responsible for executing `Job` instances.
 * Provides error handling, retry logic, and timeout support.
 *
 * @example
 * ```typescript
 * const worker = new Worker({
 *   maxAttempts: 3,
 *   timeout: 60
 * })
 *
 * await worker.process(job)
 * ```
 */
export class Worker {
  constructor(private options: WorkerOptions = {}) {}

  /**
   * Process a Job.
   * @param job - Job instance
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
   * Handle failure.
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

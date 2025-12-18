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
    const maxAttempts = this.options.maxAttempts ?? 3
    const timeout = this.options.timeout

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        job.attempts = attempt
        job.maxAttempts = maxAttempts

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

        // Success
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Last attempt: run failure handling
        if (attempt === maxAttempts) {
          await this.handleFailure(job, lastError)
          throw lastError
        }

        // Retry with exponential backoff
        const delay = Math.min(1000 * 2 ** (attempt - 1), 30000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
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

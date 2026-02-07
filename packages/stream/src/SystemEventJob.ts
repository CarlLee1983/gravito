import { app } from '@gravito/core'
import { Job } from './Job'

/**
 * SystemEventJob - Internal job for processing Gravito async hooks.
 *
 * @internal
 */
export class SystemEventJob extends Job {
  /**
   * Optional failure callback for DLQ handling.
   */
  private onFailedCallback?: (error: Error, attempt: number) => Promise<void>

  constructor(
    public readonly hook: string,
    public readonly args: unknown,
    public readonly options: Record<string, any> = {}
  ) {
    super()

    // Apply options to job configuration
    if (options.queue) this.onQueue(options.queue)
    if (options.priority) this.withPriority(options.priority)
    if (options.delay) this.delay(options.delay)
    if (options.retryAfter) this.backoff(options.retryAfter, options.retryMultiplier)
    // options.connection handling depends on Job implementation, keeping it if it was there?
    // Original line 18: if (options.connection) this.onConnection(options.connection)
    if (options.connection) this.onConnection(options.connection)
  }

  /**
   * Set failure callback for DLQ handling.
   *
   * @param callback - Called when job fails permanently
   * @returns Self for chaining
   */
  onFailed(callback: (error: Error, attempt: number) => Promise<void>): this {
    this.onFailedCallback = callback
    return this
  }

  /**
   * Execute the hook listeners in the worker process.
   */
  async handle(): Promise<void> {
    const core = app()
    if (core?.hooks) {
      // Use doActionSync to execute listeners in the worker process
      // and avoid infinite recursion if asyncByDefault is true.
      await core.hooks.doActionSync(this.hook, this.args)
    }
  }

  /**
   * Called when job fails permanently after all retries.
   *
   * This method is invoked by the worker when job exhausts all retry attempts.
   */
  async failed(error: Error, attempt = 1): Promise<void> {
    if (this.onFailedCallback) {
      try {
        await this.onFailedCallback(error, attempt)
      } catch (callbackError) {
        console.error('[SystemEventJob] Failed callback error:', callbackError)
      }
    }
  }
}

import { app } from '@gravito/core'
import { Job } from './Job'

/**
 * SystemEventJob - Internal job for processing Gravito async hooks.
 *
 * @internal
 */
export class SystemEventJob extends Job {
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
}

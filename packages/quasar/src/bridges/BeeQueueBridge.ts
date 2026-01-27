import { BaseZenithBridge } from './BaseZenithBridge'

/**
 * Bee-Queue Bridge
 *
 * Monitors Bee-Queue events and reports job lifecycle to Zenith.
 *
 * @example
 * ```typescript
 * import Queue from 'bee-queue'
 * import { BeeQueueBridge } from '@gravito/quasar/bridges'
 *
 * const queue = new Queue('emails')
 * const bridge = new BeeQueueBridge(redis, 'flux_console:', 'worker-1')
 * bridge.attach(queue)
 *
 * queue.process(async (job) => { ... })
 * ```
 */
export class BeeQueueBridge extends BaseZenithBridge {
  attach(queue: any): void {
    // Bee-Queue events:
    // - 'job succeeded': job completed successfully
    // - 'job failed': job failed with error
    // - 'job progress': job progress update

    const onSucceeded = async (job: any, result: any) => {
      await this.publishLog({
        level: 'success',
        message: `Completed job: ${job.id}`,
        jobId: job.id,
        context: {
          data: job.data,
          result: typeof result === 'object' ? JSON.stringify(result) : result,
        },
      })
      this.endJobSpan(job.id)
    }

    const onFailed = async (job: any, error: Error) => {
      await this.publishLog({
        level: 'error',
        message: `Job failed: ${job.id} - ${error.message}`,
        jobId: job.id,
        context: {
          data: job.data,
          error: error.message,
          stack: error.stack,
        },
      })
      this.endJobSpan(job.id)
    }

    const onProgress = async (job: any, progress: number) => {
      await this.publishLog({
        level: 'info',
        message: `Job progress: ${job.id}`,
        jobId: job.id,
        context: {
          data: job.data,
          progress,
        },
      })
    }

    // Attach listeners
    queue.on('job succeeded', onSucceeded)
    queue.on('job failed', onFailed)
    queue.on('job progress', onProgress)
    queue.on('active', (job: any) => {
      this.startJobSpan(job.id, job.data)
    })

    // Register for cleanup
    this.registerListener(queue, 'job succeeded', onSucceeded)
    this.registerListener(queue, 'job failed', onFailed)
    this.registerListener(queue, 'job progress', onProgress)
    this.registerListener(queue, 'active', (job: any) => {
      this.startJobSpan(job.id, job.data)
    })
  }
}

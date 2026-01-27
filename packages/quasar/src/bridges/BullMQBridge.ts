import { BaseZenithBridge } from './BaseZenithBridge'

/**
 * BullMQ Bridge
 *
 * Monitors BullMQ Worker events and reports job lifecycle to Zenith.
 *
 * @example
 * ```typescript
 * import { Worker } from 'bullmq'
 * import { BullMQBridge } from '@gravito/quasar/bridges'
 *
 * const worker = new Worker('emails', async (job) => { ... })
 * const bridge = new BullMQBridge(redis, 'flux_console:', 'worker-1')
 * bridge.attach(worker)
 * ```
 */
export class BullMQBridge extends BaseZenithBridge {
  attach(worker: any): void {
    // BullMQ Worker events:
    // - 'active': job started processing
    // - 'completed': job finished successfully
    // - 'failed': job failed with error
    // - 'progress': job progress update (optional)

    const onActive = async (job: any) => {
      this.startJobSpan(job.id, job.data)
      await this.publishLog({
        level: 'info',
        message: `Processing job: ${job.name || job.id}`,
        jobId: job.id,
        context: {
          name: job.name,
          data: job.data,
        },
      })
    }

    const onCompleted = async (job: any, result: any) => {
      await this.publishLog({
        level: 'success',
        message: `Completed job: ${job.name || job.id}`,
        jobId: job.id,
        context: {
          name: job.name,
          result: typeof result === 'object' ? JSON.stringify(result) : result,
        },
      })
      this.endJobSpan(job.id)
    }

    const onFailed = async (job: any, error: Error) => {
      await this.publishLog({
        level: 'error',
        message: `Job failed: ${job?.name || job?.id} - ${error.message}`,
        jobId: job?.id,
        context: {
          name: job?.name,
          error: error.message,
          stack: error.stack,
        },
      })
      this.endJobSpan(job?.id)
    }

    const onProgress = async (job: any, progress: number | object) => {
      await this.publishLog({
        level: 'info',
        message: `Job progress: ${job.name || job.id}`,
        jobId: job.id,
        context: {
          name: job.name,
          progress,
        },
      })
    }

    // Attach listeners
    worker.on('active', onActive)
    worker.on('completed', onCompleted)
    worker.on('failed', onFailed)
    worker.on('progress', onProgress)

    // Register for cleanup
    this.registerListener(worker, 'active', onActive)
    this.registerListener(worker, 'completed', onCompleted)
    this.registerListener(worker, 'failed', onFailed)
    this.registerListener(worker, 'progress', onProgress)
  }
}

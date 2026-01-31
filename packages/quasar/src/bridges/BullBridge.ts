import { BaseZenithBridge } from './BaseZenithBridge'

/**
 * Bridge for Bull v3/v4 queues.
 * Hooks into 'completed', 'failed', 'active', 'progress' events.
 */
export class BullBridge extends BaseZenithBridge {
  /**
   * Attach this bridge to a Bull v3/v4 queue.
   * @param queue - Bull queue instance
   */
  attach(queue: any): void {
    // Bull v3/v4 uses global events on the queue instance
    this.registerListener(queue, 'completed', (job: any, result: any) =>
      this.handleJobCompleted(job, result)
    )
    this.registerListener(queue, 'failed', (job: any, error: Error) =>
      this.handleJobFailed(job, error)
    )
    this.registerListener(queue, 'active', (job: any) => this.handleJobActive(job))
    this.registerListener(queue, 'progress', (job: any, progress: number) =>
      this.handleJobProgress(job, progress)
    )

    // Setup listeners
    if (this.listeners[0]) {
      queue.on('completed', this.listeners[0].handler)
    }
    if (this.listeners[1]) {
      queue.on('failed', this.listeners[1].handler)
    }
    if (this.listeners[2]) {
      queue.on('active', this.listeners[2].handler)
    }
    if (this.listeners[3]) {
      queue.on('progress', this.listeners[3].handler)
    }
  }

  private handleJobActive(job: any): void {
    this.startJobSpan(String(job.id), job.data)
    this.publishLog({
      level: 'info',
      message: `Job ${job.id} started`,
      jobId: String(job.id),
      context: {
        event: 'job_started',
        queue: job.queue?.name || 'unknown',
        data: job.data,
      },
    })
  }

  private handleJobCompleted(job: any, result: any): void {
    this.publishLog({
      level: 'success',
      message: `Job ${job.id} completed`,
      jobId: String(job.id),
      context: {
        event: 'job_completed',
        queue: job.queue?.name || 'unknown',
        data: result,
      },
    })
    this.endJobSpan(String(job.id))
  }

  private handleJobFailed(job: any, error: Error): void {
    this.publishLog({
      level: 'error',
      message: `Job ${job.id} failed: ${error.message}`,
      jobId: String(job.id),
      context: {
        event: 'job_failed',
        queue: job.queue?.name || 'unknown',
        stack: error.stack,
        data: job.data,
      },
    })
    this.endJobSpan(String(job.id))
  }

  private handleJobProgress(job: any, progress: number): void {
    this.publishLog({
      level: 'info',
      message: `Job ${job.id} progress: ${progress}%`,
      jobId: String(job.id),
      context: {
        event: 'job_progress',
        queue: job.queue?.name || 'unknown',
        progress,
      },
    })
  }
}

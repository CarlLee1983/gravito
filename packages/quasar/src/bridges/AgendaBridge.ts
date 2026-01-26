import { BaseZenithBridge } from './BaseZenithBridge'

/**
 * Bridge for Agenda (MongoDB-based job scheduler).
 * Hooks into 'start', 'complete', 'fail' events.
 */
export class AgendaBridge extends BaseZenithBridge {
  attach(agenda: any): void {
    this.registerListener(agenda, 'start', (job: any) => this.handleJobStart(job))
    this.registerListener(agenda, 'complete', (job: any) => this.handleJobComplete(job))
    this.registerListener(agenda, 'fail', (err: Error, job: any) => this.handleJobFail(job, err))

    // Agenda emits events on the agenda instance
    if (this.listeners[0]) agenda.on('start', this.listeners[0].handler)
    if (this.listeners[1]) agenda.on('complete', this.listeners[1].handler)
    if (this.listeners[2]) agenda.on('fail', this.listeners[2].handler)
  }

  private handleJobStart(job: any): void {
    const jobName = job.attrs?.name || job.name || 'unknown'
    const jobId = job.attrs?._id?.toString() || job.id || 'unknown'

    this.publishLog({
      level: 'info',
      message: `Job ${jobName} started`,
      jobId: jobId,
      context: {
        event: 'job_started',
        queue: jobName,
        data: job.attrs?.data || {},
      },
    })
  }

  private handleJobComplete(job: any): void {
    const jobName = job.attrs?.name || job.name || 'unknown'
    const jobId = job.attrs?._id?.toString() || job.id || 'unknown'

    this.publishLog({
      level: 'success',
      message: `Job ${jobName} completed`,
      jobId: jobId,
      context: {
        event: 'job_completed',
        queue: jobName,
        data: job.attrs?.result || {},
      },
    })
  }

  private handleJobFail(job: any, error: Error): void {
    const jobName = job.attrs?.name || job.name || 'unknown'
    const jobId = job.attrs?._id?.toString() || job.id || 'unknown'

    this.publishLog({
      level: 'error',
      message: `Job ${jobName} failed: ${error.message}`,
      jobId: jobId,
      context: {
        event: 'job_failed',
        queue: jobName,
        stack: error.stack,
        data: job.attrs?.data || {},
      },
    })
  }
}

import type { Redis } from 'ioredis'
import { BaseZenithBridge } from './BaseZenithBridge'

export interface EventMapping {
  started?: string
  completed?: string
  failed?: string
  progress?: string
}

/**
 * Generic Bridge for any EventEmitter-based queue system.
 * Allows custom mapping of events to Zenith log types.
 */
export class GenericBridge extends BaseZenithBridge {
  constructor(
    redis: Redis,
    prefix: string,
    workerId: string,
    private eventMapping: EventMapping,
    private queueName = 'generic',
    options: {
      batchSize?: number
      flushInterval?: number
      maxHistorySize?: number
      useCompression?: boolean
      compressionThreshold?: number
    } = {}
  ) {
    super(redis, prefix, workerId, options)
  }

  /**
   * Attach this bridge to an EventEmitter.
   * @param emitter - EventEmitter instance
   */
  attach(emitter: any): void {
    if (this.eventMapping.started) {
      this.setupListener(emitter, this.eventMapping.started, 'job_started')
    }
    if (this.eventMapping.completed) {
      this.setupListener(emitter, this.eventMapping.completed, 'job_completed')
    }
    if (this.eventMapping.failed) {
      this.setupListener(emitter, this.eventMapping.failed, 'job_failed')
    }
    if (this.eventMapping.progress) {
      this.setupListener(emitter, this.eventMapping.progress, 'job_progress')
    }
  }

  private setupListener(emitter: any, eventName: string, logType: string): void {
    const handler = (...args: any[]) => {
      // Best-effort extraction of job info
      // Assumes first argument is job or job-like object
      const job = args[0] || {}
      const error = args.find((arg) => arg instanceof Error)
      const result = args.length > 1 && !error ? args[1] : undefined
      const jobId = String(job.id || job._id || 'unknown')

      if (logType === 'job_started') {
        this.startJobSpan(jobId, job.data || job.attrs?.data || job)
      }

      const level =
        logType.includes('failed') || logType.includes('error')
          ? 'error'
          : logType.includes('completed') || logType.includes('success')
            ? 'success'
            : 'info'

      this.publishLog({
        level: level as 'info' | 'success' | 'error',
        message: `Job event ${logType} on ${this.queueName}`,
        jobId: jobId,
        context: {
          event: logType,
          queue: this.queueName,
          args,
          result,
          stack: error?.stack,
        },
      })

      if (logType === 'job_completed' || logType === 'job_failed') {
        this.endJobSpan(jobId)
      }
    }

    this.registerListener(emitter, eventName, handler)
    if (typeof emitter.on === 'function') {
      emitter.on(eventName, handler)
    } else if (typeof emitter.addEventListener === 'function') {
      emitter.addEventListener(eventName, handler)
    }
  }
}

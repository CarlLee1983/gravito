import type { Span } from '@opentelemetry/api'
import type { EventEmitter } from 'events'
import type { Redis } from 'ioredis'
import type { QuasarTracing } from '../tracing/QuasarTracing'
import type { LogSampler } from '../utils/LogSampler'
import { LogBuffer } from './LogBuffer'
import type { LogMiddleware, QueueBridge, ZenithLogPayload } from './types'

/**
 * Base class for all Zenith bridges.
 * Handles Redis connection and log publishing.
 */
export abstract class BaseZenithBridge implements QueueBridge {
  protected listeners: Array<{ target: any; event: string; handler: Function }> = []
  protected logBuffer: LogBuffer
  protected tracing?: QuasarTracing
  protected activeSpans: Map<string, Span> = new Map()
  protected emitter?: EventEmitter
  protected sampler?: LogSampler

  constructor(
    protected redis: Redis,
    protected prefix = 'flux_console:',
    protected workerId?: string,
    options: {
      batchSize?: number
      flushInterval?: number
      maxHistorySize?: number
      useCompression?: boolean
      compressionThreshold?: number
      tracing?: QuasarTracing
      emitter?: EventEmitter
      middlewares?: LogMiddleware[]
      sampler?: LogSampler
    } = {}
  ) {
    this.logBuffer = new LogBuffer(redis, prefix, {
      batchSize: options.batchSize ?? 100,
      flushInterval: options.flushInterval ?? 1000,
      maxHistorySize: options.maxHistorySize,
      useCompression: options.useCompression,
      compressionThreshold: options.compressionThreshold,
      middlewares: options.middlewares,
      sampler: options.sampler,
    })
    this.tracing = options.tracing
    this.emitter = options.emitter
    this.sampler = options.sampler
  }

  /**
   * Update the log sampler for the bridge and its underlying buffer.
   *
   * @param sampler - The new LogSampler instance.
   * @since 9.0.0
   *
   * @example
   * ```typescript
   * bridge.setSampler(new LogSampler({ threshold: 1000 }));
   * ```
   */
  setSampler(sampler: LogSampler): void {
    this.sampler = sampler
    this.logBuffer.setSampler(sampler)
  }

  /**
   * Start a span for a job and return trace context.
   */
  protected startJobSpan(jobId: string, jobData: any): void {
    if (!this.tracing || !jobId) return

    const parentCtx = this.tracing.extractContext(jobData || {})
    const span = this.tracing.startSpan(`job:${jobId}`, parentCtx)
    if (span) {
      this.activeSpans.set(jobId, span)
    }
  }

  /**
   * End a span for a job.
   */
  protected endJobSpan(jobId: string): void {
    const span = this.activeSpans.get(jobId)
    if (span) {
      span.end()
      this.activeSpans.delete(jobId)
    }
  }

  /**
   * Inject trace context into payload if a span is active.
   */
  protected injectTraceContext(payload: ZenithLogPayload): ZenithLogPayload {
    if (!payload.jobId) return payload

    const span = this.activeSpans.get(payload.jobId)
    if (span && this.tracing) {
      const { traceId, spanId } = this.tracing.getTraceContext(span)
      return {
        ...payload,
        traceId,
        spanId,
      }
    }

    return payload
  }

  /**
   * Publish a log message to Zenith.
   */
  protected async publishLog(payload: ZenithLogPayload): Promise<void> {
    const tracedPayload = this.injectTraceContext(payload)
    const fullPayload = {
      ...tracedPayload,
      workerId: tracedPayload.workerId || this.workerId,
      timestamp: tracedPayload.timestamp || new Date().toISOString(),
    }

    await this.logBuffer.add(fullPayload)

    if (this.emitter) {
      this.emitter.emit('log', fullPayload)
      if (fullPayload.level === 'error') {
        this.emitter.emit('error', fullPayload)
      }
    }
  }

  /**
   * Register an event listener for cleanup.
   */
  protected registerListener(target: any, event: string, handler: Function): void {
    this.listeners.push({ target, event, handler })
  }

  abstract attach(target: any): void

  /**
   * Detach all event listeners.
   */
  detach(): void {
    for (const { target, event, handler } of this.listeners) {
      if (typeof target.off === 'function') {
        target.off(event, handler as any)
      } else if (typeof target.removeListener === 'function') {
        target.removeListener(event, handler as any)
      }
    }
    this.listeners = []
    this.logBuffer.stop()
  }
}

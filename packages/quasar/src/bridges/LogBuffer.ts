import type { Redis } from 'ioredis'
import { SmartCompressor } from '../utils/Compression'
import type { LogSampler } from '../utils/LogSampler'
import { JsonSerializer, type Serializer } from '../utils/Serializer'
import type { LogMiddleware, ZenithLogPayload } from './types'

export class LogBuffer {
  private buffer: ZenithLogPayload[] = []
  private timer: Timer | null = null
  private compressor?: SmartCompressor
  private serializer: Serializer
  private sampler?: LogSampler
  private middlewares: LogMiddleware[] = []

  constructor(
    private redis: Redis,
    private prefix: string,
    private options: {
      batchSize: number
      flushInterval: number
      maxHistorySize?: number
      maxPayloadSize?: number
      useCompression?: boolean
      compressionThreshold?: number
      serializer?: Serializer
      sampler?: LogSampler
      middlewares?: LogMiddleware[]
    } = { batchSize: 100, flushInterval: 1000, maxPayloadSize: 1024 * 64 }
  ) {
    this.serializer = this.options.serializer || new JsonSerializer()
    this.sampler = this.options.sampler
    this.middlewares = this.options.middlewares || []
    if (this.options.useCompression) {
      this.compressor = new SmartCompressor({
        threshold: this.options.compressionThreshold ?? 2048,
      })
    }
    this.startTimer()
  }

  async add(log: ZenithLogPayload): Promise<void> {
    if (this.sampler && !this.sampler.shouldLog(log.level)) {
      return
    }

    let processedLog = log
    for (const middleware of this.middlewares) {
      processedLog = await middleware.process(processedLog)
    }

    processedLog = this.truncateLog(processedLog)
    this.buffer.push(processedLog)
    if (this.buffer.length >= this.options.batchSize) {
      await this.flush()
    }
  }

  /**
   * Update the log sampler at runtime.
   *
   * Allows changing sampling strategies (e.g., in response to system load)
   * without needing to recreate the log buffer.
   *
   * @param sampler - The new LogSampler instance.
   * @since 9.0.0
   *
   * @example
   * ```typescript
   * buffer.setSampler(new LogSampler({ threshold: 500 }));
   * ```
   */
  setSampler(sampler: LogSampler): void {
    this.sampler = sampler
  }

  private truncateLog(log: ZenithLogPayload): ZenithLogPayload {
    if (!this.options.maxPayloadSize || !log.context) {
      return log
    }

    const serialized = this.serializer.serialize(log)
    if (serialized.length <= this.options.maxPayloadSize) {
      return log
    }

    const truncatedLog = { ...log, context: { ...log.context } }
    const limit = this.options.maxPayloadSize / 2

    if (truncatedLog.context.data && JSON.stringify(truncatedLog.context.data).length > limit) {
      truncatedLog.context.data = {
        _truncated: true,
        _originalSize: JSON.stringify(truncatedLog.context.data).length,
        summary:
          typeof truncatedLog.context.data === 'object'
            ? Object.keys(truncatedLog.context.data as object).slice(0, 5)
            : 'too large',
      }
    }

    if (truncatedLog.context.error && JSON.stringify(truncatedLog.context.error).length > limit) {
      const errorStr =
        typeof truncatedLog.context.error === 'string'
          ? truncatedLog.context.error
          : JSON.stringify(truncatedLog.context.error)
      truncatedLog.context.error = `${errorStr.substring(0, limit as number)}... [TRUNCATED]`
    }

    return truncatedLog
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return
    }

    const logs = this.buffer.splice(0)

    try {
      const pipeline = this.redis.pipeline()

      for (const log of logs) {
        const serialized = this.serializer.serialize(log)
        const channel = `${this.prefix}logs`

        if (this.compressor) {
          const result = this.compressor.compress(serialized)
          if (result.compressed) {
            const wrapped = {
              _c: result.algorithm === 'brotli' ? 'br' : 'gz',
              _d: result.data.toString('base64'),
              _s: this.serializer.contentType,
            }
            pipeline.publish(channel, JSON.stringify(wrapped))
          } else {
            pipeline.publish(channel, serialized)
          }
        } else {
          pipeline.publish(channel, serialized)
        }
      }

      const historyKey = `${this.prefix}logs:history`

      if (logs.length > 0) {
        const serializedLogs = logs.map((l) => this.serializer.serialize(l))
        const maxHistorySize = this.options.maxHistorySize ?? 100
        pipeline.lpush(historyKey, ...(serializedLogs as any))
        pipeline.ltrim(historyKey, 0, maxHistorySize - 1)
      }

      await pipeline.exec()
    } catch (err) {
      console.error('[LogBuffer] Failed to flush logs', err)
    }
  }

  private startTimer(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
    this.timer = setInterval(() => {
      this.flush()
    }, this.options.flushInterval)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.flush()
  }
}

import type { Redis } from 'ioredis'
import type { ZenithLogPayload } from './types'

export class LogBuffer {
  private buffer: ZenithLogPayload[] = []
  private timer: Timer | null = null

  constructor(
    private redis: Redis,
    private prefix: string,
    private options: {
      batchSize: number
      flushInterval: number
      maxHistorySize?: number
      maxPayloadSize?: number
    } = { batchSize: 100, flushInterval: 1000, maxPayloadSize: 1024 * 64 }
  ) {
    this.startTimer()
  }

  add(log: ZenithLogPayload): void {
    const processedLog = this.truncateLog(log)
    this.buffer.push(processedLog)
    if (this.buffer.length >= this.options.batchSize) {
      this.flush()
    }
  }

  private truncateLog(log: ZenithLogPayload): ZenithLogPayload {
    if (!this.options.maxPayloadSize) return log

    const serialized = JSON.stringify(log)
    if (serialized.length <= this.options.maxPayloadSize) return log

    // If too large, try to truncate data and error fields which are usually the largest
    const truncatedLog = { ...log }
    const limit = this.options.maxPayloadSize / 2

    if (truncatedLog.data && JSON.stringify(truncatedLog.data).length > limit) {
      truncatedLog.data = {
        _truncated: true,
        _originalSize: JSON.stringify(truncatedLog.data).length,
        summary:
          typeof truncatedLog.data === 'object'
            ? Object.keys(truncatedLog.data as object).slice(0, 5)
            : 'too large',
      }
    }

    if (truncatedLog.error && JSON.stringify(truncatedLog.error).length > limit) {
      const errorStr =
        typeof truncatedLog.error === 'string'
          ? truncatedLog.error
          : JSON.stringify(truncatedLog.error)
      truncatedLog.error = errorStr.substring(0, limit as number) + '... [TRUNCATED]'
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
        pipeline.publish(`${this.prefix}logs`, JSON.stringify(log))
      }

      const historyKey = `${this.prefix}logs:history`

      if (logs.length > 0) {
        const serializedLogs = logs.map((l) => JSON.stringify(l))
        const maxHistorySize = this.options.maxHistorySize ?? 100
        pipeline.lpush(historyKey, ...serializedLogs)
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

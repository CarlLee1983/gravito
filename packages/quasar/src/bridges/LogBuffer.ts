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
    } = { batchSize: 100, flushInterval: 1000 }
  ) {
    this.startTimer()
  }

  add(log: ZenithLogPayload): void {
    this.buffer.push(log)
    if (this.buffer.length >= this.options.batchSize) {
      this.flush()
    }
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

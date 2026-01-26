import type { Redis } from 'ioredis'

interface PendingOperation {
  operation: 'set' | 'publish' | 'lpush' | 'del' | 'expire'
  args: any[]
}

export interface RedisBatcherOptions {
  maxBatchSize: number
  flushInterval: number
}

export class RedisBatcher {
  private pending: PendingOperation[] = []
  private timer: Timer | null = null

  constructor(
    private redis: Redis,
    private options: RedisBatcherOptions = {
      maxBatchSize: 50,
      flushInterval: 100,
    }
  ) {
    this.startTimer()
  }

  set(key: string, value: string, ...args: any[]): void {
    this.pending.push({ operation: 'set', args: [key, value, ...args] })
    this.maybeFlush()
  }

  publish(channel: string, message: string): void {
    this.pending.push({ operation: 'publish', args: [channel, message] })
    this.maybeFlush()
  }

  lpush(key: string, ...values: string[]): void {
    this.pending.push({ operation: 'lpush', args: [key, ...values] })
    this.maybeFlush()
  }

  del(key: string): void {
    this.pending.push({ operation: 'del', args: [key] })
    this.maybeFlush()
  }

  expire(key: string, seconds: number): void {
    this.pending.push({ operation: 'expire', args: [key, seconds] })
    this.maybeFlush()
  }

  private maybeFlush(): void {
    if (this.pending.length >= this.options.maxBatchSize) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.pending.length === 0) return

    const batch = this.pending.splice(0)
    const pipeline = this.redis.pipeline()

    for (const { operation, args } of batch) {
      ;(pipeline as any)[operation](...args)
    }

    try {
      await pipeline.exec()
    } catch (err) {
      console.error('[RedisBatcher] Flush failed', err)
    }
  }

  private startTimer(): void {
    if (this.timer) clearInterval(this.timer)
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

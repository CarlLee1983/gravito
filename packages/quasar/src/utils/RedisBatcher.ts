import type { Redis } from 'ioredis'
import { JsonSerializer, type Serializer } from './Serializer'

interface PendingOperation {
  operation: 'set' | 'publish' | 'lpush' | 'del' | 'expire'
  args: any[]
}

export interface RedisBatcherOptions {
  maxBatchSize: number
  flushInterval: number
  serializer?: Serializer
}

export class RedisBatcher {
  private pending: PendingOperation[] = []
  private timer: Timer | null = null
  private serializer: Serializer

  constructor(
    private redis: Redis,
    private options: RedisBatcherOptions = {
      maxBatchSize: 50,
      flushInterval: 100,
    }
  ) {
    this.serializer = options.serializer ?? new JsonSerializer()
    this.startTimer()
  }

  set(key: string, value: any, ...args: any[]): void {
    const serialized = typeof value === 'string' ? value : this.serializer.serialize(value)
    this.pending.push({ operation: 'set', args: [key, serialized, ...args] })
    this.maybeFlush()
  }

  publish(channel: string, message: any): void {
    const serialized = typeof message === 'string' ? message : this.serializer.serialize(message)
    this.pending.push({ operation: 'publish', args: [channel, serialized] })
    this.maybeFlush()
  }

  lpush(key: string, ...values: any[]): void {
    const serializedValues = values.map((v) =>
      typeof v === 'string' ? v : this.serializer.serialize(v)
    )
    this.pending.push({ operation: 'lpush', args: [key, ...serializedValues] })
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
    if (this.pending.length === 0) {
      return
    }

    const batch = this.pending.splice(0)
    const pipeline =
      this.redis && typeof this.redis.pipeline === 'function' ? this.redis.pipeline() : null

    if (!pipeline || typeof pipeline.exec !== 'function') {
      for (const { operation, args } of batch) {
        if (this.redis && typeof (this.redis as any)[operation] === 'function') {
          ;(this.redis as any)[operation](...args)
        } else if (this.redis) {
          const lowerOp = operation.toLowerCase()
          if (typeof (this.redis as any)[lowerOp] === 'function') {
            ;(this.redis as any)[lowerOp](...args)
          }
        }
      }
      return
    }

    for (const { operation, args } of batch) {
      if (typeof (pipeline as any)[operation] === 'function') {
        ;(pipeline as any)[operation](...args)
      } else {
        const lowerOp = operation.toLowerCase()
        if (typeof (pipeline as any)[lowerOp] === 'function') {
          ;(pipeline as any)[lowerOp](...args)
        }
      }
    }

    try {
      await pipeline.exec()
    } catch (err) {
      console.error('[RedisBatcher] Flush failed', err)
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

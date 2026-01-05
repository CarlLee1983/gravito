import type { Redis } from 'ioredis'
import type { QueueProbe, QueueSnapshot } from '../types'

export class LaravelProbe implements QueueProbe {
  constructor(
    private redis: Redis,
    private queueName: string,
    private prefix = 'queues' // Laravel default prefix
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    // Laravel default redis keys:
    // Waiting: queues:{name} (List)
    // Delayed: queues:{name}:delayed (ZSet)
    // Reserved (Active): queues:{name}:reserved (ZSet)

    const keyWait = `${this.prefix}:${this.queueName}`
    const keyDelayed = `${this.prefix}:${this.queueName}:delayed`
    const keyReserved = `${this.prefix}:${this.queueName}:reserved`

    // Pipeline commands for efficiency
    const pipeline = this.redis.pipeline()
    pipeline.llen(keyWait)
    pipeline.zcard(keyReserved)
    pipeline.zcard(keyDelayed)

    // Note: Standard Laravel without Horizon typically stores failed jobs in Database (MySQL),
    // so we might return 0 for failed unless user configures Horizon mode.
    // We'll leave it 0 for now to be safe.

    const results = await pipeline.exec()

    // Safety checks
    const waiting = (results?.[0]?.[1] as number) || 0
    const active = (results?.[1]?.[1] as number) || 0
    const delayed = (results?.[2]?.[1] as number) || 0

    return {
      name: this.queueName,
      driver: 'redis',
      size: {
        waiting,
        active, // "reserved" in Laravel terms
        delayed,
        failed: 0, // Cannot read from Redis easily in standard setup
      },
    }
  }
}

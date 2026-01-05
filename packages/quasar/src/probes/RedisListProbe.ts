import type { Redis } from 'ioredis'
import type { QueueProbe, QueueSnapshot } from '../types'

export class RedisListProbe implements QueueProbe {
  constructor(
    private redis: Redis,
    private queueName: string
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    const len = await this.redis.llen(this.queueName)

    return {
      name: this.queueName,
      driver: 'redis',
      size: {
        waiting: len,
        active: 0,
        failed: 0,
        delayed: 0,
      },
    }
  }
}

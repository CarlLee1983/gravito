import type { Redis } from 'ioredis'
import type { QueueProbe, QueueSnapshot } from '../types'

/**
 * RedisListProbe monitors a standard Redis list used as a simple queue.
 *
 * It retrieves the length of the list (using `LLEN`) to provide a snapshot
 * of the queue size. This probe is suitable for basic Redis-based queues.
 *
 * @public
 * @since 3.0.0
 */
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

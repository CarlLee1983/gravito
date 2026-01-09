import type { Redis } from 'ioredis'
import type { QueueProbe, QueueSnapshot } from '../types'

export class BullProbe implements QueueProbe {
  constructor(
    private redis: Redis,
    private queueName: string,
    private prefix = 'bull'
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    const key = (suffix: string) => `${this.prefix}:${this.queueName}:${suffix}`

    // Pipelining for performance
    const pipeline = this.redis.pipeline()

    // Bull Standard:
    // waiting: List
    // active: List
    // delayed: ZSet
    // failed: ZSet

    // BullMQ Standard often uses 'wait' instead of 'waiting', but we can check both or assume 'waiting' for legacy Bull.
    // If we support BullMQ specifically, we might need a separate probe or a check.
    // For now, let's assume standard Bull (v3/v4).

    pipeline.llen(key('waiting'))
    pipeline.llen(key('active'))
    pipeline.zcard(key('delayed'))
    pipeline.zcard(key('failed'))

    // Also check 'wait' (BullMQ style) just in case, but usually we'd want a separate driver option.
    // Let's stick to Bull classic for now.

    const results = await pipeline.exec()
    if (!results) throw new Error('Redis pipeline failed')

    // Parse results
    // Each result is [err, value]
    const [_waitingErr, waiting] = results[0]
    const [_activeErr, active] = results[1]
    const [_delayedErr, delayed] = results[2]
    const [_failedErr, failed] = results[3]

    return {
      name: this.queueName,
      driver: 'redis',
      size: {
        waiting: Number(waiting || 0),
        active: Number(active || 0),
        failed: Number(failed || 0),
        delayed: Number(delayed || 0),
      },
    }
  }
}

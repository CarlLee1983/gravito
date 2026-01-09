import type { Redis } from 'ioredis'
import type { QueueProbe, QueueSnapshot } from '../types'

/**
 * BullMQ Probe (Bull v5+)
 *
 * BullMQ uses different Redis key structure than Bull v3/v4:
 * - Waiting: {prefix}:{name}:wait (List)
 * - Active: {prefix}:{name}:active (List)
 * - Delayed: {prefix}:{name}:delayed (Sorted Set)
 * - Failed: {prefix}:{name}:failed (Set)
 *
 * @example
 * ```typescript
 * const probe = new BullMQProbe(redis, 'emails', 'bull')
 * const snapshot = await probe.getSnapshot()
 * ```
 */
export class BullMQProbe implements QueueProbe {
  constructor(
    private redis: Redis,
    private queueName: string,
    private prefix = 'bull'
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    const key = (suffix: string) => `${this.prefix}:${this.queueName}:${suffix}`

    // Pipelining for performance
    const pipeline = this.redis.pipeline()

    // BullMQ Standard (v5+):
    // wait: List (note: 'wait' not 'waiting')
    // active: List
    // delayed: Sorted Set
    // failed: Set

    pipeline.llen(key('wait'))
    pipeline.llen(key('active'))
    pipeline.zcard(key('delayed'))
    pipeline.scard(key('failed'))

    const results = await pipeline.exec()
    if (!results) throw new Error('Redis pipeline failed')

    // Parse results
    // Each result is [err, value]
    const [_waitErr, waiting] = results[0]
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

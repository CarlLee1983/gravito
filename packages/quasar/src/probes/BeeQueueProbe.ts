import type { Redis } from 'ioredis'
import type { QueueProbe, QueueSnapshot } from '../types'

/**
 * Bee-Queue Probe
 *
 * Bee-Queue uses the following Redis key structure:
 * - Waiting: {prefix}:{name}:waiting (List)
 * - Active: {prefix}:{name}:active (List)
 * - Failed: {prefix}:{name}:failed (List)
 * - Stalling: {prefix}:{name}:stalling (Set) - not included in snapshot
 *
 * Default prefix is 'bq'.
 *
 * @example
 * ```typescript
 * const probe = new BeeQueueProbe(redis, 'emails', 'bq')
 * const snapshot = await probe.getSnapshot()
 * ```
 */
export class BeeQueueProbe implements QueueProbe {
  constructor(
    private redis: Redis,
    private queueName: string,
    private prefix = 'bq'
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    const key = (suffix: string) => `${this.prefix}:${this.queueName}:${suffix}`

    // Pipelining for performance
    const pipeline = this.redis.pipeline()

    // Bee-Queue Standard:
    // waiting: List
    // active: List
    // failed: List
    // Note: Bee-Queue doesn't have a built-in delayed queue

    pipeline.llen(key('waiting'))
    pipeline.llen(key('active'))
    pipeline.llen(key('failed'))

    const results = await pipeline.exec()
    if (!results) throw new Error('Redis pipeline failed')

    // Parse results
    // Each result is [err, value]
    const [_waitingErr, waiting] = results[0]
    const [_activeErr, active] = results[1]
    const [_failedErr, failed] = results[2]

    return {
      name: this.queueName,
      driver: 'redis',
      size: {
        waiting: Number(waiting || 0),
        active: Number(active || 0),
        failed: Number(failed || 0),
        delayed: 0, // Bee-Queue doesn't support delayed jobs natively
      },
    }
  }
}

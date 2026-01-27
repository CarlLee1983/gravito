import { bench, describe } from 'vitest'
import { CachedNodeProbe } from '../src/probes/CachedNodeProbe'
import { NodeProbe } from '../src/probes/NodeProbe'
import { AdaptiveHeartbeat } from '../src/utils/AdaptiveHeartbeat'
import { RedisBatcher } from '../src/utils/RedisBatcher'

describe('Heartbeat Performance', () => {
  bench('AdaptiveHeartbeat with success', async () => {
    const heartbeat = new AdaptiveHeartbeat(
      async () => {
        return
      },
      {
        baseInterval: 1000,
        minInterval: 500,
        maxInterval: 3000,
        jitter: 0.1,
        backoffMultiplier: 1.5,
      }
    )

    heartbeat.start()
    await new Promise((resolve) => setTimeout(resolve, 100))
    heartbeat.stop()
  })

  bench('AdaptiveHeartbeat with failures', async () => {
    const heartbeat = new AdaptiveHeartbeat(
      async () => {
        throw new Error('Simulated failure')
      },
      {
        baseInterval: 1000,
        minInterval: 500,
        maxInterval: 3000,
        jitter: 0.1,
        backoffMultiplier: 1.5,
      }
    )

    heartbeat.start()
    await new Promise((resolve) => setTimeout(resolve, 100))
    heartbeat.stop()
  })
})

describe('Probe Performance', () => {
  bench('NodeProbe - uncached', async () => {
    const probe = new NodeProbe()
    await probe.getMetrics()
  })

  bench('CachedNodeProbe - with cache', async () => {
    const baseProbe = new NodeProbe()
    const cachedProbe = new CachedNodeProbe(baseProbe, { cacheTimeout: 1000 })

    await cachedProbe.getMetrics()
    await cachedProbe.getMetrics()
    await cachedProbe.getMetrics()
  })

  bench('CachedNodeProbe - cache expired', async () => {
    const baseProbe = new NodeProbe()
    const cachedProbe = new CachedNodeProbe(baseProbe, { cacheTimeout: 1 })

    await cachedProbe.getMetrics()
    await new Promise((resolve) => setTimeout(resolve, 5))
    await cachedProbe.getMetrics()
  })
})

describe('Redis Batching Performance', () => {
  const mockRedis = {
    pipeline: () => ({
      set: () => {
        return
      },
      publish: () => {
        return
      },
      lpush: () => {
        return
      },
      exec: async () => [],
    }),
  } as unknown as any

  bench('RedisBatcher - batch mode', async () => {
    const batcher = new RedisBatcher(mockRedis, {
      maxBatchSize: 50,
      flushInterval: 1000,
    })

    for (let i = 0; i < 100; i++) {
      batcher.set(`key-${i}`, `value-${i}`)
    }

    await batcher.flush()
    batcher.stop()
  })

  bench('Redis direct - no batching', async () => {
    const pipeline = mockRedis.pipeline()

    for (let i = 0; i < 100; i++) {
      pipeline.set(`key-${i}`, `value-${i}`)
    }

    await pipeline.exec()
  })
})

describe('Memory Usage - History Limits', () => {
  bench('Small history (100 items)', () => {
    const logs = Array.from({ length: 1000 }, (_, i) => ({
      queueName: 'test',
      jobId: `job-${i}`,
      status: 'completed',
      timestamp: new Date().toISOString(),
    }))

    logs.slice(-100)
  })

  bench('Large history (1000 items)', () => {
    const logs = Array.from({ length: 10000 }, (_, i) => ({
      queueName: 'test',
      jobId: `job-${i}`,
      status: 'completed',
      timestamp: new Date().toISOString(),
    }))

    logs.slice(-1000)
  })
})

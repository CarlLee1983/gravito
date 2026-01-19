import Redis from 'ioredis'
import { bench, run } from 'mitata'
import { Job } from '../src/Job'
import { QueueManager } from '../src/QueueManager'

class BenchJob extends Job {
  constructor(public payload: any) {
    super()
  }
  async handle() {}
}

const redis = new Redis({
  host: 'localhost',
  port: 6379,
})

const manager = new QueueManager({
  default: 'redis',
  connections: {
    redis: {
      driver: 'redis',
      client: redis as any,
    },
    memory: {
      driver: 'memory',
    },
  },
  defaultSerializer: 'json',
})

const queue = 'bench-queue'

async function setup() {
  await manager.clear(queue)
  console.log('--- Starting Benchmark ---')
}

await setup()

// --- Redis Benchmarks ---

bench('Redis: push - single', async () => {
  await manager.push(new BenchJob({ hello: 'world' }).onConnection('redis'), { queue })
})

bench('Redis: pushMany - 100', async () => {
  const jobs = Array.from({ length: 100 }, (_, i) => new BenchJob({ i }).onConnection('redis'))
  await manager.pushMany(jobs)
})

bench('Redis: pop - single', async () => {
  await manager.pop(queue, 'redis')
})

const redisDriver = manager.getDriver('redis')
bench('Redis: popMany - 100', async () => {
  await redisDriver.popMany!(queue, 100)
})

bench('Redis: pop - with priority (Lua)', async () => {
  await manager.push(new BenchJob({ p: 'high' }).withPriority('high').onConnection('redis'), {
    queue,
  })
  await manager.pop(queue, 'redis')
})

// --- Memory Benchmarks ---

bench('Memory: push - single', async () => {
  await manager.push(new BenchJob({ hello: 'world' }).onConnection('memory'), { queue })
})

bench('Memory: pushMany - 100', async () => {
  const jobs = Array.from({ length: 100 }, (_, i) => new BenchJob({ i }).onConnection('memory'))
  await manager.pushMany(jobs)
})

bench('Memory: pop - single', async () => {
  await manager.pop(queue, 'memory')
})

const memDriver = manager.getDriver('memory')
bench('Memory: popMany - 100', async () => {
  await memDriver.popMany!(queue, 100)
})

await run()
await redis.quit()
process.exit(0)

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
  },
  defaultSerializer: 'json',
})

const queue = 'bench-queue'

async function setup() {
  await manager.clear(queue)
  console.log('--- Starting Benchmark ---')
}

await setup()

bench('push - single', async () => {
  await manager.push(new BenchJob({ hello: 'world' }), { queue })
})

bench('pushMany - 100', async () => {
  const jobs = Array.from({ length: 100 }, (_, i) => new BenchJob({ i }))
  await manager.pushMany(jobs)
})

bench('pop - single', async () => {
  await manager.pop(queue)
})

const driver = manager.getDriver('redis')
bench('popMany - 100', async () => {
  await driver.popMany!(queue, 100)
})

bench('pop - with priority (Lua)', async () => {
  // Pushing different priorities to test Lua script logic
  await manager.push(new BenchJob({ p: 'high' }).withPriority('high'), { queue })
  await manager.pop(queue)
})

bench('popBlocking - 1s timeout', async () => {
  // This measures the overhead of BRPOP when data is already available
  await manager.push(new BenchJob({ hello: 'blocking' }), { queue })
  await driver.popBlocking!(queue, 1)
})

await run()
await redis.quit()
process.exit(0)

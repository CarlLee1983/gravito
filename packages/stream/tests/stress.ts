import Redis from 'ioredis'
import { Job } from '../src/Job'
import { QueueManager } from '../src/QueueManager'

class PerformanceJob extends Job {
  constructor(public payload: any) {
    super()
  }
  async handle() {
    // Simulated work
  }
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

const queue = 'stress-queue'

async function runStress() {
  await manager.clear(queue)

  const totalJobs = 50000
  const batchSize = 100

  console.log(`\n--- Stress Test (${totalJobs} jobs) ---`)

  // 1. Push
  const startPush = performance.now()
  for (let i = 0; i < totalJobs / batchSize; i++) {
    const jobs = Array.from({ length: batchSize }, (_, j) =>
      new PerformanceJob({ id: i * batchSize + j }).onQueue(queue)
    )
    await manager.pushMany(jobs)
  }
  const pushDuration = (performance.now() - startPush) / 1000
  const pushThroughput = totalJobs / pushDuration
  console.log(
    `Push: ${totalJobs} jobs in ${pushDuration.toFixed(2)}s (${pushThroughput.toFixed(0)} jobs/s)`
  )

  // 2. Pop
  const startPop = performance.now()
  let poppedCount = 0
  const driver = manager.getDriver('redis')

  while (poppedCount < totalJobs) {
    const jobs = await driver.popMany?.(queue, batchSize)
    if (jobs.length === 0) {
      break
    }
    poppedCount += jobs.length
  }

  const popDuration = (performance.now() - startPop) / 1000
  const popThroughput = poppedCount / popDuration
  console.log(
    `Pop:  ${poppedCount} jobs in ${popDuration.toFixed(2)}s (${popThroughput.toFixed(0)} jobs/s)`
  )

  // 3. Simple E2E (Single operations)
  const e2eCount = 5000
  console.log(`\n--- E2E Latency Test (${e2eCount} single operations) ---`)
  const startE2E = performance.now()
  for (let i = 0; i < e2eCount; i++) {
    await manager.push(new PerformanceJob({ i }), { queue })
    await manager.pop(queue)
  }
  const e2eDuration = (performance.now() - startE2E) / 1000
  const latPerOp = (e2eDuration / e2eCount) * 1000
  console.log(
    `E2E: ${e2eCount} cycles in ${e2eDuration.toFixed(2)}s (${latPerOp.toFixed(3)} ms/op)`
  )
}

try {
  await runStress()
} finally {
  await redis.quit()
  process.exit(0)
}

import { BunRedisClient } from '../src/clients/BunRedisClient'
import { RedisClient } from '../src/RedisClient'
import type { RedisConfig } from '../src/types'

const config: RedisConfig = {
  host: 'localhost',
  port: 6379,
  db: 0,
}

const ITERATIONS = 100000
const PIPELINE_BATCH = 100

async function benchmark(name: string, fn: () => Promise<void>) {
  const start = performance.now()
  await fn()
  const end = performance.now()
  const duration = end - start
  const ops = (ITERATIONS / duration) * 1000
  console.log(`${name.padEnd(30)}: ${ops.toFixed(2)} ops/sec (${duration.toFixed(2)}ms total)`)
  return ops
}

async function run() {
  console.log('Preparing clients...')
  const bunClient = new BunRedisClient(config)
  const ioClient = new RedisClient(config)

  await bunClient.connect()
  await ioClient.connect()

  // Warmup
  console.log('Warming up...')
  await bunClient.set('warmup', '1')
  await ioClient.set('warmup', '1')

  console.log(`\nStarting Benchmark (${ITERATIONS} iterations)...\n`)

  console.log('--- SET Operation ---')
  await benchmark('BunRedisClient (SET)', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      await bunClient.set(`b:k:${i}`, 'v')
    }
  })
  await benchmark('ioredis (SET)', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      await ioClient.set(`i:k:${i}`, 'v')
    }
  })

  console.log('\n--- GET Operation ---')
  await benchmark('BunRedisClient (GET)', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      await bunClient.get(`b:k:${i}`)
    }
  })
  await benchmark('ioredis (GET)', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      await ioClient.get(`i:k:${i}`)
    }
  })

  console.log(`\n--- Pipeline SET (Batch: ${PIPELINE_BATCH}) ---`)
  const batches = ITERATIONS / PIPELINE_BATCH

  await benchmark('BunRedisClient (Pipeline)', async () => {
    for (let i = 0; i < batches; i++) {
      const pipe = bunClient.pipeline()
      for (let j = 0; j < PIPELINE_BATCH; j++) {
        pipe.set(`b:p:${i}:${j}`, 'v')
      }
      await pipe.exec()
    }
  })

  await benchmark('ioredis (Pipeline)', async () => {
    for (let i = 0; i < batches; i++) {
      const pipe = ioClient.pipeline()
      for (let j = 0; j < PIPELINE_BATCH; j++) {
        pipe.set(`i:p:${i}:${j}`, 'v')
      }
      await pipe.exec()
    }
  })

  console.log('\nCleaning up...')
  await bunClient.flushdb()
  await bunClient.disconnect()
  await ioClient.disconnect()
}

run().catch(console.error)

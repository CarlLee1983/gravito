
import { MemoryDriver } from '../src/drivers/MemoryDriver'
import { RedisDriver } from '../src/drivers/RedisDriver'
import { Job } from '../src/Job'
import { SerializedJob } from '../src/types'
import Redis from 'ioredis'

// Simple benchmarking utility
class Benchmark {
  private results: Record<string, any> = {}

  async measure(name: string, fn: () => Promise<void>, iterations: number) {
    const start = process.hrtime.bigint()
    for (let i = 0; i < iterations; i++) {
      await fn()
    }
    const end = process.hrtime.bigint()
    const duration = Number(end - start) / 1e6 // ms
    const opsPerSec = (iterations / duration) * 1000

    console.log(`${name}: ${iterations} iterations in ${duration.toFixed(2)}ms (${opsPerSec.toFixed(2)} ops/sec)`)

    this.results[name] = {
        iterations,
        durationMs: duration,
        opsPerSec
    }
  }

  async run() {
    console.log('--- Starting Benchmark ---')
    await this.runMemoryBenchmark()

    // Check if Redis is available
    try {
        const redis = new Redis({
            maxRetriesPerRequest: 1,
            retryStrategy: () => null // Fail fast
        })
        await redis.ping()
        await this.runRedisBenchmark(redis)
        await redis.quit()
    } catch (e) {
        console.log('Skipping Redis benchmark (Redis not available)')
    }

    console.log('--- Benchmark Complete ---')
    // console.log(JSON.stringify(this.results, null, 2))
  }

  private async runMemoryBenchmark() {
    console.log('\n[MemoryDriver]')
    const driver = new MemoryDriver()
    const job: SerializedJob = {
        id: '1',
        type: 'json',
        data: JSON.stringify({ message: 'test' }),
        createdAt: Date.now()
    }

    await this.measure('MemoryDriver.push', async () => {
        await driver.push('bench', job)
    }, 10000)

    await this.measure('MemoryDriver.pop', async () => {
        await driver.pop('bench')
    }, 10000)

    const jobs = Array(100).fill(job)
    await this.measure('MemoryDriver.pushMany (100 items)', async () => {
        await driver.pushMany('bench', jobs)
    }, 100)

     await this.measure('MemoryDriver.popMany (100 items)', async () => {
        await driver.popMany('bench', 100)
    }, 100)
  }

  private async runRedisBenchmark(client: any) {
    console.log('\n[RedisDriver]')
    const driver = new RedisDriver({ client })
    const queue = 'bench_queue'
    await driver.clear(queue)

    const job: SerializedJob = {
        id: '1',
        type: 'json',
        data: JSON.stringify({ message: 'test' }),
        createdAt: Date.now()
    }

    await this.measure('RedisDriver.push', async () => {
        await driver.push(queue, job)
    }, 1000)

    await this.measure('RedisDriver.pop', async () => {
        await driver.pop(queue)
    }, 1000)

    // Setup for pushMany
    const jobs = Array(100).fill(job)
    await this.measure('RedisDriver.pushMany (100 items)', async () => {
        await driver.pushMany(queue, jobs)
    }, 100)

    // Prepare enough items for popMany benchmark
    // await driver.pushMany(queue, Array(100 * 100).fill(job))

    await this.measure('RedisDriver.popMany (100 items)', async () => {
        await driver.popMany(queue, 100)
    }, 100)

    await driver.clear(queue)
  }
}

new Benchmark().run().catch(console.error)

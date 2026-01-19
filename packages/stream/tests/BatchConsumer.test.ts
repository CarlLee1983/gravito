import { describe, expect, it, mock } from 'bun:test'
import { BatchConsumer } from '../src/BatchConsumer'
import { Job } from '../src/Job'
import { QueueManager } from '../src/QueueManager'

class TestJob extends Job {
  async handle() {}
}

describe('BatchConsumer', () => {
  it('should consume jobs in batches', async () => {
    const manager = new QueueManager({ defaultSerializer: 'json' })
    const jobs = Array.from({ length: 5 }, (_, i) => {
      const job = new TestJob()
      job.id = `job-${i}`
      return job
    })

    await manager.pushMany(jobs)

    let processedCount = 0
    const consumer = new BatchConsumer(
      manager,
      async (batch) => {
        processedCount += batch.length
      },
      { batchSize: 2, pollInterval: 10 }
    ) // Small interval for test speed

    // Start consumer (async)
    const consumePromise = consumer.start()

    // Wait for processing
    // 5 jobs, batch 2 -> 2, 2, 1
    // Should happen quickly
    await new Promise((r) => setTimeout(r, 100))
    consumer.stop()
    await consumePromise

    expect(processedCount).toBe(5)

    // Verify they are removed from queue
    const remaining = await manager.size('default')
    expect(remaining).toBe(0)
  })

  it('should handle errors and fail jobs', async () => {
    const manager = new QueueManager({ defaultSerializer: 'json' })
    const job = new TestJob()
    job.id = 'fail-job'
    await manager.push(job)

    const consumer = new BatchConsumer(
      manager,
      async () => {
        throw new Error('Batch failed')
      },
      { batchSize: 1, pollInterval: 10 }
    )

    const consumePromise = consumer.start()
    await new Promise((r) => setTimeout(r, 50))
    consumer.stop()
    await consumePromise

    // Job should be failed
    // MemoryDriver stats failed count
    const stats = await manager.stats('default')
    expect(stats.failed).toBe(1)
  })
})

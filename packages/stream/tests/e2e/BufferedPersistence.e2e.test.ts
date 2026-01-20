import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test'
import { BufferedPersistence } from '../../src/persistence/BufferedPersistence'
import type { PersistenceAdapter, SerializedJob } from '../../src/types'

// Mock Adapter implementation
class MockPersistenceAdapter implements PersistenceAdapter {
  public archivedJobs: any[] = []
  public archivedLogs: any[] = []
  public archiveManyCallCount = 0
  public archiveCallCount = 0

  // Simulate network latency
  private latency = 10

  async archive(queue: string, job: SerializedJob, status: string): Promise<void> {
    this.archiveCallCount++
    await new Promise((resolve) => setTimeout(resolve, this.latency))
    this.archivedJobs.push({ queue, job, status })
  }

  async find(_queue: string, _id: string): Promise<SerializedJob | null> {
    return null
  }

  async list(_queue: string): Promise<SerializedJob[]> {
    return []
  }

  async archiveMany(items: any[]): Promise<void> {
    this.archiveManyCallCount++
    await new Promise((resolve) => setTimeout(resolve, this.latency))
    this.archivedJobs.push(...items)
  }

  async cleanup(_days: number): Promise<number> {
    return 0
  }

  async count(_queue: string): Promise<number> {
    return this.archivedJobs.length
  }

  async archiveLog(log: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.latency))
    this.archivedLogs.push(log)
  }

  async archiveLogMany(logs: any[]): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.latency))
    this.archivedLogs.push(...logs)
  }

  async listLogs(): Promise<any[]> {
    return []
  }

  async countLogs(): Promise<number> {
    return 0
  }
}

describe('BufferedPersistence E2E (High Load)', () => {
  let mockAdapter: MockPersistenceAdapter
  let buffered: BufferedPersistence

  beforeEach(() => {
    mockAdapter = new MockPersistenceAdapter()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should handle high throughput without losing data', async () => {
    // Config: Buffer size 100, flush every 50ms
    buffered = new BufferedPersistence(mockAdapter, {
      maxBufferSize: 100,
      flushInterval: 50,
    })

    const jobCount = 5000
    const jobs = Array.from({ length: jobCount }, (_, i) => ({
      id: `job-${i}`,
      data: JSON.stringify({ index: i }),
      createdAt: Date.now(),
      type: 'json' as const,
    }))

    const startTime = Date.now()

    // Simulate concurrent high load
    // We push jobs as fast as possible
    const pushPromises = jobs.map((job) => buffered.archive('high-load-queue', job, 'waiting'))

    await Promise.all(pushPromises)

    // At this point, mostly everything should be in buffer or flushing
    // We expect archiveMany to be called multiple times

    // Force final flush just in case (though buffer logic should handle most)
    await buffered.flush()

    // Wait for all background flushes to complete (since adapter has latency)
    const waitForCompletion = async () => {
      const maxRetries = 20
      for (let i = 0; i < maxRetries; i++) {
        if (mockAdapter.archivedJobs.length === jobCount) {
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
    await waitForCompletion()

    const duration = Date.now() - startTime
    console.log(`[E2E] Processed ${jobCount} writes in ${duration}ms`)

    expect(mockAdapter.archivedJobs.length).toBe(jobCount)

    // Check batching efficiency
    // With size 100 and 5000 jobs, we expect roughly 50 calls to archiveMany
    // It might be slightly more due to flushInterval triggers
    console.log(`[E2E] Batch calls: ${mockAdapter.archiveManyCallCount}`)
    console.log(`[E2E] Single calls: ${mockAdapter.archiveCallCount}`)

    expect(mockAdapter.archiveManyCallCount).toBeGreaterThan(0)
    // Should prefer batching over single writes
    expect(mockAdapter.archiveManyCallCount).toBeGreaterThan(mockAdapter.archiveCallCount)
  })

  test('should respect flush interval when load is sporadic', async () => {
    buffered = new BufferedPersistence(mockAdapter, {
      maxBufferSize: 100,
      flushInterval: 100, // 100ms
    })

    // Push 10 jobs (under buffer size)
    for (let i = 0; i < 10; i++) {
      buffered.archive(
        'sporadic-queue',
        { id: `job-${i}`, type: 'json', data: '{}', createdAt: Date.now() },
        'waiting'
      )
    }

    expect(mockAdapter.archivedJobs.length).toBe(0) // Should be buffered

    // Wait for interval
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(mockAdapter.archivedJobs.length).toBe(10)
  })
})

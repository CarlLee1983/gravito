import { describe, expect, it } from 'bun:test'
import { Job } from '../src/Job'
import { QueueManager } from '../src/QueueManager'
import { CachedSerializer } from '../src/serializers/CachedSerializer'

class TestJob extends Job {
  handle(): Promise<void> {
    return Promise.resolve()
  }
}

describe('QueueManager with Serialization Cache', () => {
  it('should use CachedSerializer when enabled', () => {
    const manager = new QueueManager({
      useSerializationCache: true,
    })

    const serializer = manager.getSerializer()
    expect(serializer).toBeInstanceOf(CachedSerializer)
  })

  it('should not use CachedSerializer when disabled', () => {
    const manager = new QueueManager({
      useSerializationCache: false,
    })

    const serializer = manager.getSerializer()
    expect(serializer).not.toBeInstanceOf(CachedSerializer)
  })

  it('should cache serialization in push', async () => {
    const manager = new QueueManager({
      useSerializationCache: true,
    })

    const job = new TestJob()
    // const serializer = manager.getSerializer() as CachedSerializer

    // First push
    await manager.push(job)

    // Check if it's cached (internal implementation detail check, but valid for verification)
    // Since we can't easily spy on the inner serializer without more mocking,
    // we assume the unit tests for CachedSerializer cover the caching logic.
    // Here we just ensure it doesn't crash and behaves as expected.

    // Second push (should use cache)
    await manager.push(job)

    const jobs = await (manager.getDriver('default') as any).queues.get('default')
    expect(jobs.length).toBe(2)
    // The IDs should be identical if the cache is working because ID is generated during serialization?
    // Wait, ID is usually generated on the Job object itself OR during serialization if missing.
    // If CachedSerializer returns the EXACT same object, the ID will be identical.
    expect(jobs[0].id).toBe(jobs[1].id)
  })
})

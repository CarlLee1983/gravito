import { describe, expect, it } from 'bun:test'
import type { Job } from '../src/Job'
import { CachedSerializer } from '../src/serializers/CachedSerializer'
import type { JobSerializer } from '../src/serializers/JobSerializer'
import type { SerializedJob } from '../src/types'

// Mock serializer
class MockSerializer implements JobSerializer {
  public serializeCalls = 0
  public deserializeCalls = 0

  serialize(job: Job): SerializedJob {
    this.serializeCalls++
    return {
      id: job.id,
      type: 'json',
      data: '{}',
      createdAt: Date.now(),
    }
  }

  deserialize(serialized: SerializedJob): Job {
    this.deserializeCalls++
    return { id: serialized.id } as Job
  }
}

describe('CachedSerializer', () => {
  it('should cache serialization results', () => {
    const mockSerializer = new MockSerializer()
    const cachedSerializer = new CachedSerializer(mockSerializer)

    const job = { id: 'test-job' } as Job

    // First call
    const result1 = cachedSerializer.serialize(job)
    expect(mockSerializer.serializeCalls).toBe(1)

    // Second call
    const result2 = cachedSerializer.serialize(job)
    expect(mockSerializer.serializeCalls).toBe(1) // Should still be 1
    expect(result2).toBe(result1) // Should be same object reference
  })

  it('should re-serialize for different job instances', () => {
    const mockSerializer = new MockSerializer()
    const cachedSerializer = new CachedSerializer(mockSerializer)

    const job1 = { id: 'job-1' } as Job
    const job2 = { id: 'job-2' } as Job

    cachedSerializer.serialize(job1)
    cachedSerializer.serialize(job2)

    expect(mockSerializer.serializeCalls).toBe(2)
  })

  it('should delegate deserialization', () => {
    const mockSerializer = new MockSerializer()
    const cachedSerializer = new CachedSerializer(mockSerializer)

    const serialized: SerializedJob = {
      id: 'test',
      type: 'json',
      data: '{}',
      createdAt: 123,
    }

    const result = cachedSerializer.deserialize(serialized)

    expect(mockSerializer.deserializeCalls).toBe(1)
    expect(result.id).toBe('test')
  })
})

import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * Cached Serializer Decorator.
 *
 * Caches the serialization result of a job instance using WeakMap.
 * This prevents redundant serialization when the same job object is passed multiple times,
 * which is common in complex workflows or when using the same job instance in tests.
 *
 * @example
 * ```typescript
 * const baseSerializer = new JsonSerializer()
 * const serializer = new CachedSerializer(baseSerializer)
 *
 * const job = new MyJob()
 * const s1 = serializer.serialize(job)
 * const s2 = serializer.serialize(job) // Returns cached result
 * ```
 */
export class CachedSerializer implements JobSerializer {
  private cache = new WeakMap<Job, SerializedJob>()

  /**
   * @param delegate - The actual serializer to use for the first serialization
   */
  constructor(private delegate: JobSerializer) {}

  /**
   * Serialize a job with caching.
   */
  serialize(job: Job): SerializedJob {
    if (this.cache.has(job)) {
      return this.cache.get(job)!
    }

    const serialized = this.delegate.serialize(job)
    this.cache.set(job, serialized)
    return serialized
  }

  /**
   * Deserialize a job.
   * No caching for deserialization as we get new objects each time from the driver.
   */
  deserialize(serialized: SerializedJob): Job {
    return this.delegate.deserialize(serialized)
  }
}

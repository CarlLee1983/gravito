import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * Cached Serializer Decorator.
 *
 * Wraps another serializer to cache the results of serialization for the same Job instance.
 * Useful when the same job object is enqueued multiple times (e.g., fan-out or testing),
 * avoiding redundant serialization overhead.
 *
 * Uses `WeakMap` to associate cached payloads with Job object references without causing memory leaks.
 *
 * @public
 * @example
 * ```typescript
 * const serializer = new CachedSerializer(new JsonSerializer());
 * ```
 */
export class CachedSerializer implements JobSerializer {
  private cache = new WeakMap<Job, SerializedJob>()

  /**
   * @param delegate - The underlying serializer to use.
   */
  constructor(private delegate: JobSerializer) {}

  /**
   * Serializes the job, returning a cached result if available.
   *
   * @param job - The job to serialize.
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
   * Deserializes a job.
   *
   * Caching is not applied here as deserialization always produces new instances.
   */
  deserialize(serialized: SerializedJob): Job {
    return this.delegate.deserialize(serialized)
  }

  /**
   * Exposes the wrapped serializer for integrations that need serializer-specific behavior.
   */
  getDelegate(): JobSerializer {
    return this.delegate
  }
}

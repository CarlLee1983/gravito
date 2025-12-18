import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * JSON Serializer
 *
 * Serializes jobs using JSON.
 * Suitable for simple scenarios where you only need to persist plain properties.
 *
 * Limitation: cannot restore class instances, functions, or complex objects.
 *
 * @example
 * ```typescript
 * const serializer = new JsonSerializer()
 * const serialized = serializer.serialize(job)
 * const job = serializer.deserialize(serialized)
 * ```
 */
export class JsonSerializer implements JobSerializer {
  /**
   * Serialize a job.
   */
  serialize(job: Job): SerializedJob {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    return {
      id,
      type: 'json',
      data: JSON.stringify({
        job: job.constructor.name,
        properties: { ...job },
      }),
      createdAt: Date.now(),
      delaySeconds: job.delaySeconds,
      attempts: job.attempts ?? 0,
      maxAttempts: job.maxAttempts,
    }
  }

  /**
   * Deserialize a job.
   *
   * Note: this implementation only restores properties and does not recreate class instances.
   * For class instances, use `ClassNameSerializer`.
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'json') {
      throw new Error('Invalid serialization type: expected "json"')
    }

    const parsed = JSON.parse(serialized.data)
    // Only restores properties, not class instances.
    const job = Object.create({})
    Object.assign(job, parsed.properties)
    return job as Job
  }
}

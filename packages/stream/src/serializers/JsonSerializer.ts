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
    const id = job.id || `${Date.now()}-${crypto.randomUUID()}`

    // Extract properties (exclude methods)
    const properties: Record<string, unknown> = {}
    for (const key in job) {
      if (
        Object.hasOwn(job, key) &&
        typeof (job as unknown as Record<string, unknown>)[key] !== 'function'
      ) {
        properties[key] = (job as unknown as Record<string, unknown>)[key]
      }
    }

    return {
      id,
      type: 'json',
      data: JSON.stringify(properties),
      createdAt: Date.now(),
      ...(job.delaySeconds !== undefined ? { delaySeconds: job.delaySeconds } : {}),
      attempts: job.attempts ?? 0,
      ...(job.maxAttempts !== undefined ? { maxAttempts: job.maxAttempts } : {}),
      ...(job.groupId ? { groupId: job.groupId } : {}),
      ...(job.priority ? { priority: job.priority } : {}),
    }
  }

  /**
   * Deserialize a job.
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'json') {
      throw new Error('Invalid serialization type: expected "json"')
    }

    const properties = JSON.parse(serialized.data)
    // Only restores properties, not class instances.
    const job = Object.create({}) as Record<string, any>
    Object.assign(job, properties)

    job.id = serialized.id
    if (serialized.groupId) {
      job.groupId = serialized.groupId
    }
    if (serialized.priority) {
      job.priority = serialized.priority
    }
    if (serialized.delaySeconds !== undefined) {
      job.delaySeconds = serialized.delaySeconds
    }
    if (serialized.attempts !== undefined) {
      job.attempts = serialized.attempts
    }

    return job as Job
  }
}

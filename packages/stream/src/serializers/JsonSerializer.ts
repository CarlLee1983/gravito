import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * JSON Serializer.
 *
 * Serializes jobs to standard JSON. This is the simplest serializer but has limitations:
 * it cannot restore class instances (methods are lost) or handle complex types like Maps/Sets.
 * Deserialized jobs will be plain objects that must be manually handled or cast.
 *
 * @public
 * @example
 * ```typescript
 * const serializer = new JsonSerializer();
 * ```
 */
export class JsonSerializer implements JobSerializer {
  /**
   * Serializes a job to a JSON object.
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
   * Deserializes a JSON object into a basic Job-like object.
   *
   * Note: The result is NOT an instance of the original Job class.
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'json') {
      throw new Error('Invalid serialization type: expected "json"')
    }

    const dataStr =
      typeof serialized.data === 'string'
        ? serialized.data
        : Buffer.from(serialized.data).toString('utf8')
    const properties = JSON.parse(dataStr)
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

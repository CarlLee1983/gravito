import { StreamError, StreamErrorCodes } from '../errors'
import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * Class Name Serializer (Laravel-style).
 *
 * Serializes jobs by storing their class name along with their properties.
 * During deserialization, it looks up the registered class constructor and creates a new instance,
 * populating it with the stored properties.
 *
 * This is the recommended serializer for most use cases as it preserves the behavior (methods)
 * of the job class.
 *
 * @public
 * @example
 * ```typescript
 * const serializer = new ClassNameSerializer();
 * serializer.register(SendEmailJob);
 *
 * const serialized = serializer.serialize(new SendEmailJob('foo@bar.com'));
 * const job = serializer.deserialize(serialized); // instanceof SendEmailJob
 * ```
 */
export class ClassNameSerializer implements JobSerializer {
  /**
   * Registry of job classes, mapped by class name.
   */
  private jobClasses = new Map<string, new (...args: unknown[]) => Job>()

  /**
   * Registers a Job class for serialization.
   *
   * @param jobClass - The job class constructor.
   */
  register(jobClass: new (...args: unknown[]) => Job): void {
    this.jobClasses.set(jobClass.name, jobClass)
  }

  /**
   * Registers multiple Job classes at once.
   *
   * @param jobClasses - An array of job class constructors.
   */
  registerMany(jobClasses: Array<new (...args: unknown[]) => Job>): void {
    for (const jobClass of jobClasses) {
      this.register(jobClass)
    }
  }

  /**
   * Serializes a Job instance.
   *
   * Captures the class name and all enumerable properties.
   *
   * @param job - The job to serialize.
   */
  serialize(job: Job): SerializedJob {
    const id = job.id || `${Date.now()}-${crypto.randomUUID()}`
    const className = job.constructor.name

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
      type: 'class',
      className,
      data: JSON.stringify(properties),
      createdAt: Date.now(),
      ...(job.delaySeconds !== undefined ? { delaySeconds: job.delaySeconds } : {}),
      attempts: job.attempts ?? 0,
      ...(job.maxAttempts !== undefined ? { maxAttempts: job.maxAttempts } : {}),
      ...(job.groupId ? { groupId: job.groupId } : {}),
      ...(job.retryAfterSeconds !== undefined ? { retryAfterSeconds: job.retryAfterSeconds } : {}),
      ...(job.retryMultiplier !== undefined ? { retryMultiplier: job.retryMultiplier } : {}),
      ...(job.priority !== undefined ? { priority: job.priority } : {}),
    }
  }

  /**
   * Deserializes a Job instance.
   *
   * Instantiates the class matching `className` and assigns properties.
   *
   * @param serialized - The serialized job.
   * @throws {Error} If the job class is not registered.
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'class') {
      throw new StreamError(500, StreamErrorCodes.SERIALIZATION_INVALID_TYPE, {
        message: 'Invalid serialization type: expected "class"',
        retryable: false,
      })
    }

    if (!serialized.className) {
      throw new StreamError(500, StreamErrorCodes.SERIALIZATION_MISSING_CLASS_NAME, {
        message: 'Missing className in serialized job',
        retryable: false,
      })
    }

    const JobClass = this.jobClasses.get(serialized.className)
    if (!JobClass) {
      throw new StreamError(500, StreamErrorCodes.SERIALIZATION_CLASS_NOT_REGISTERED, {
        message: `Job class "${serialized.className}" is not registered. Please register it using serializer.register().`,
        retryable: false,
      })
    }

    const dataStr =
      typeof serialized.data === 'string'
        ? serialized.data
        : Buffer.from(serialized.data).toString('utf8')
    const properties = JSON.parse(dataStr)
    const job = new JobClass()

    // Restore properties
    if (properties) {
      Object.assign(job, properties)
    }

    // Restore metadata
    job.id = serialized.id

    // Restore Queueable fields
    if (serialized.delaySeconds !== undefined) {
      job.delaySeconds = serialized.delaySeconds
    }
    if (serialized.attempts !== undefined) {
      job.attempts = serialized.attempts
    }
    if (serialized.maxAttempts !== undefined) {
      job.maxAttempts = serialized.maxAttempts
    }
    if (serialized.groupId !== undefined) {
      job.groupId = serialized.groupId
    }
    if (serialized.retryAfterSeconds !== undefined) {
      job.retryAfterSeconds = serialized.retryAfterSeconds
    }
    if (serialized.retryMultiplier !== undefined) {
      job.retryMultiplier = serialized.retryMultiplier
    }
    if (serialized.priority !== undefined) {
      job.priority = serialized.priority
    }

    return job
  }
}

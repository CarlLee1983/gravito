import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * Class name serializer (Laravel-style).
 *
 * Stores the class name and properties, then recreates an instance at runtime.
 * This is the recommended serializer because it can restore class instances correctly.
 *
 * Requirement: Job classes must be dynamically loadable (by class name).
 *
 * @example
 * ```typescript
 * const serializer = new ClassNameSerializer()
 * const serialized = serializer.serialize(new SendEmail('user@example.com'))
 * // serialized.data contains class name and properties
 *
 * const job = serializer.deserialize(serialized)
 * // job is an instance of SendEmail
 * ```
 */
export class ClassNameSerializer implements JobSerializer {
  /**
   * Job class registry (for resolving classes by name).
   */
  private jobClasses = new Map<string, new (...args: unknown[]) => Job>()

  /**
   * Register a Job class.
   * @param jobClass - Job class
   */
  register(jobClass: new (...args: unknown[]) => Job): void {
    this.jobClasses.set(jobClass.name, jobClass)
  }

  /**
   * Register multiple Job classes.
   * @param jobClasses - Job class array
   */
  registerMany(jobClasses: Array<new (...args: unknown[]) => Job>): void {
    for (const jobClass of jobClasses) {
      this.register(jobClass)
    }
  }

  /**
   * Serialize a Job.
   */
  serialize(job: Job): SerializedJob {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const className = job.constructor.name

    // Extract properties (exclude methods)
    const properties: Record<string, unknown> = {}
    for (const key in job) {
      if (Object.hasOwn(job, key) && typeof (job as Record<string, unknown>)[key] !== 'function') {
        properties[key] = (job as Record<string, unknown>)[key]
      }
    }

    return {
      id,
      type: 'class',
      className,
      data: JSON.stringify({
        class: className,
        properties,
      }),
      createdAt: Date.now(),
      delaySeconds: job.delaySeconds,
      attempts: job.attempts ?? 0,
      maxAttempts: job.maxAttempts,
    }
  }

  /**
   * Deserialize a Job.
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'class') {
      throw new Error('Invalid serialization type: expected "class"')
    }

    if (!serialized.className) {
      throw new Error('Missing className in serialized job')
    }

    const JobClass = this.jobClasses.get(serialized.className)
    if (!JobClass) {
      throw new Error(
        `Job class "${serialized.className}" is not registered. Please register it using serializer.register().`
      )
    }

    const parsed = JSON.parse(serialized.data)
    const job = new JobClass()

    // Restore properties
    if (parsed.properties) {
      Object.assign(job, parsed.properties)
    }

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

    return job
  }
}

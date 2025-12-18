import type { Job } from '../Job'
import type { SerializedJob } from '../types'

/**
 * Job serializer interface.
 *
 * Responsible for serializing and deserializing jobs.
 * Supports multiple strategies (JSON, class-name, etc.).
 *
 * @example
 * ```typescript
 * class MySerializer implements JobSerializer {
 *   serialize(job: Job): SerializedJob {
 *     // serialization logic
 *   }
 *
 *   deserialize(serialized: SerializedJob): Job {
 *     // deserialization logic
 *   }
 * }
 * ```
 */
export interface JobSerializer {
  /**
   * Serialize a job.
   * @param job - Job instance
   * @returns Serialized job payload
   */
  serialize(job: Job): SerializedJob

  /**
   * Deserialize a job.
   * @param serialized - Serialized job payload
   * @returns Job instance
   */
  deserialize(serialized: SerializedJob): Job
}

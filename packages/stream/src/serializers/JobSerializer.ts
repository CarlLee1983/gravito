import type { Job } from '../Job'
import type { SerializedJob } from '../types'

/**
 * Job serializer interface.
 *
 * Defines the contract for serializing job objects into storage-friendly formats
 * (strings/buffers) and deserializing them back into executable Job instances.
 *
 * @public
 * @example
 * ```typescript
 * class JSONSerializer implements JobSerializer {
 *   serialize(job) { return { ...job, data: JSON.stringify(job) }; }
 *   deserialize(serialized) { return JSON.parse(serialized.data); }
 * }
 * ```
 */
export interface JobSerializer {
  /**
   * Converts a Job instance into a serializable object.
   *
   * @param job - The job instance to serialize.
   * @returns A `SerializedJob` object containing the data payload and metadata.
   */
  serialize(job: Job): SerializedJob

  /**
   * Reconstructs a Job instance from a serialized object.
   *
   * @param serialized - The serialized job data.
   * @returns A fully hydrated Job instance ready for execution.
   */
  deserialize(serialized: SerializedJob): Job
}

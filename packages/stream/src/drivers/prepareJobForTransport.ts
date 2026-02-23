import type { SerializedJob } from '../types'

/**
 * Prepares a job for transport by converting Uint8Array data to Base64 string.
 *
 * This ensures safe JSON serialization across all drivers (Redis, RabbitMQ, SQS, Database).
 *
 * @param job - The serialized job to prepare for transport.
 * @returns Job with data in transportable format (string for binary/msgpack types).
 */
export function prepareJobForTransport(job: SerializedJob): SerializedJob {
  if ((job.type === 'binary' || job.type === 'msgpack') && job.data instanceof Uint8Array) {
    // Convert Uint8Array to Base64 string for safe JSON transport
    const base64 = Buffer.from(job.data).toString('base64')
    return {
      ...job,
      data: base64,
    }
  }

  return job
}

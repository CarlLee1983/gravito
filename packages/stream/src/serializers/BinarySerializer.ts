import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

// Synchronous cborg import using require
// This is loaded at module level to ensure it works in Bun
let cborgModule: any

try {
  cborgModule = require('cborg')
} catch (_e) {
  // Will be caught at runtime
  cborgModule = null
}

/**
 * Binary Serializer using CBOR.
 *
 * Serializes jobs using CBOR (Concise Binary Object Representation) for optimal
 * performance and size. Provides 2-5x faster serialization/deserialization compared
 * to JSON and 20-40% smaller payloads.
 *
 * Requires the `cborg` dependency.
 *
 * @public
 * @example
 * ```typescript
 * const serializer = new BinarySerializer();
 * const serialized = serializer.serialize(job);
 * const deserialized = serializer.deserialize(serialized);
 * ```
 */
export class BinarySerializer implements JobSerializer {
  private getCborg() {
    if (!cborgModule) {
      throw new Error('BinarySerializer requires cborg. Please install it: bun add cborg')
    }
    return cborgModule
  }

  /**
   * Serialize a job using CBOR.
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

    // Encode using CBOR
    const cborg = this.getCborg()
    const encoded = cborg.encode(properties)

    return {
      id,
      type: 'binary',
      data: encoded,
      createdAt: Date.now(),
      ...(job.delaySeconds !== undefined ? { delaySeconds: job.delaySeconds } : {}),
      attempts: job.attempts ?? 0,
      ...(job.maxAttempts !== undefined ? { maxAttempts: job.maxAttempts } : {}),
      ...(job.groupId ? { groupId: job.groupId } : {}),
      ...(job.priority ? { priority: job.priority } : {}),
      ...(job.retryAfterSeconds !== undefined ? { retryAfterSeconds: job.retryAfterSeconds } : {}),
      ...(job.retryMultiplier !== undefined ? { retryMultiplier: job.retryMultiplier } : {}),
    }
  }

  /**
   * Deserialize a CBOR job.
   *
   * Supports three data formats:
   * - Uint8Array (native CBOR binary)
   * - Base64 string (from Redis/transport)
   * - ArrayBuffer (from Worker Transferable)
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'binary') {
      throw new TypeError(`Expected binary type, got ${serialized.type}`)
    }

    let bytes: Uint8Array
    const data = serialized.data as unknown

    if (typeof data === 'string') {
      // Base64 string (from Redis transport)
      try {
        bytes = new Uint8Array(Buffer.from(data, 'base64'))
      } catch (err) {
        throw new Error(
          `Failed to decode Base64 data: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    } else if (data instanceof Uint8Array) {
      // Native Uint8Array
      bytes = data
    } else if (data instanceof ArrayBuffer) {
      // ArrayBuffer (from Worker Transferable)
      bytes = new Uint8Array(data)
    } else {
      throw new TypeError(`Invalid data type for binary deserialization: ${typeof data}`)
    }

    // Decode using CBOR
    let properties: any
    try {
      const cborg = this.getCborg()
      properties = cborg.decode(bytes)
    } catch (err) {
      throw new Error(
        `Failed to decode CBOR data: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    const job = Object.create({}) as Record<string, any>
    if (properties) {
      Object.assign(job, properties)
    }

    // Restore metadata from serialized job
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
    if (serialized.maxAttempts !== undefined) {
      job.maxAttempts = serialized.maxAttempts
    }
    if (serialized.retryAfterSeconds !== undefined) {
      job.retryAfterSeconds = serialized.retryAfterSeconds
    }
    if (serialized.retryMultiplier !== undefined) {
      job.retryMultiplier = serialized.retryMultiplier
    }

    return job as Job
  }
}

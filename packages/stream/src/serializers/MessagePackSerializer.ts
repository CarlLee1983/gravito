import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * MessagePack Serializer.
 *
 * Serializes jobs using MessagePack (binary format), encoded as a Base64 string.
 * Offers smaller payload sizes than JSON for complex data structures.
 *
 * Requires the optional `@msgpack/msgpack` dependency.
 *
 * @public
 * @example
 * ```typescript
 * const serializer = new MessagePackSerializer();
 * ```
 */
export class MessagePackSerializer implements JobSerializer {
  private msgpack: any

  constructor() {
    try {
      this.msgpack = require('@msgpack/msgpack')
    } catch (_e) {
      throw new Error(
        'MessagePackSerializer requires @msgpack/msgpack. Please install it: bun add @msgpack/msgpack'
      )
    }
  }

  /**
   * Serialize a job using MessagePack.
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

    const encoded = this.msgpack.encode(properties)
    const data = Buffer.from(encoded).toString('base64')

    return {
      id,
      type: 'msgpack',
      data,
      createdAt: Date.now(),
      ...(job.delaySeconds !== undefined ? { delaySeconds: job.delaySeconds } : {}),
      attempts: job.attempts ?? 0,
      ...(job.maxAttempts !== undefined ? { maxAttempts: job.maxAttempts } : {}),
      ...(job.groupId ? { groupId: job.groupId } : {}),
      ...(job.priority ? { priority: job.priority } : {}),
    }
  }

  /**
   * Deserialize a MessagePack job.
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'msgpack') {
      throw new Error('Invalid serialization type: expected "msgpack"')
    }

    const buffer =
      typeof serialized.data === 'string'
        ? Buffer.from(serialized.data, 'base64')
        : Buffer.from(serialized.data)
    const properties = this.msgpack.decode(buffer) as Record<string, any>

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

import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * JSON Serializer
 *
 * 使用 JSON 序列化 Job 資料。
 * 適合簡單場景，直接序列化 Job 的所有屬性。
 *
 * **限制**：無法序列化函數、類別實例等複雜物件。
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
   * 序列化 Job
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
   * 反序列化 Job
   *
   * **注意**：此實作僅能還原屬性，無法還原類別實例。
   * 對於需要類別實例的場景，請使用 ClassNameSerializer。
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'json') {
      throw new Error('Invalid serialization type: expected "json"')
    }

    const parsed = JSON.parse(serialized.data)
    // 注意：此實作僅能還原屬性，無法還原類別實例
    // 實際使用時應該使用 ClassNameSerializer
    const job = Object.create({})
    Object.assign(job, parsed.properties)
    return job as Job
  }
}

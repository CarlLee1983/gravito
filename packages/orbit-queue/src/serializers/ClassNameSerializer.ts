import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * Class Name Serializer（Laravel 風格）
 *
 * 儲存類別名稱和參數，執行時動態載入類別實例。
 * 這是推薦的序列化方式，因為它可以正確還原類別實例。
 *
 * **要求**：Job 類別必須可以被動態載入（通過類別名稱）。
 *
 * @example
 * ```typescript
 * const serializer = new ClassNameSerializer()
 * const serialized = serializer.serialize(new SendEmail('user@example.com'))
 * // serialized.data 包含類別名稱和參數
 *
 * const job = serializer.deserialize(serialized)
 * // job 是 SendEmail 的實例
 * ```
 */
export class ClassNameSerializer implements JobSerializer {
  /**
   * Job 類別註冊表
   * 用於根據類別名稱動態載入類別
   */
  private jobClasses = new Map<string, new (...args: unknown[]) => Job>()

  /**
   * 註冊 Job 類別
   * @param jobClass - Job 類別
   */
  register(jobClass: new (...args: unknown[]) => Job): void {
    this.jobClasses.set(jobClass.name, jobClass)
  }

  /**
   * 批量註冊 Job 類別
   * @param jobClasses - Job 類別陣列
   */
  registerMany(jobClasses: Array<new (...args: unknown[]) => Job>): void {
    for (const jobClass of jobClasses) {
      this.register(jobClass)
    }
  }

  /**
   * 序列化 Job
   */
  serialize(job: Job): SerializedJob {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const className = job.constructor.name

    // 提取 Job 的屬性（排除方法）
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
   * 反序列化 Job
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

    // 還原屬性
    if (parsed.properties) {
      Object.assign(job, parsed.properties)
    }

    // 還原 Queueable 屬性
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
